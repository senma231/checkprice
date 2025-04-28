import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PriceValidator } from "@/lib/price-validator";

// 获取单个价格详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);

    // 获取价格详情
    const price = await prisma.price.findUnique({
      where: { id },
      include: {
        originRegion: true,
        destinationRegion: true,
      }
    });

    if (!price) {
      return NextResponse.json(
        { success: false, message: "价格不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error("获取价格详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格详情失败" },
      { status: 500 }
    );
  }
}

// 更新价格
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查是否有编辑价格的权限
    const hasPermission = session.user.permissions.includes("price:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑价格的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const body = await request.json();

    // 检查价格是否存在
    const existingPrice = await prisma.price.findUnique({
      where: { id }
    });

    if (!existingPrice) {
      return NextResponse.json(
        { success: false, message: "价格不存在" },
        { status: 404 }
      );
    }

    // 验证价格数据
    const validation = PriceValidator.validatePriceData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: "价格数据无效", errors: validation.errors },
        { status: 400 }
      );
    }

    // 检查价格冲突
    const conflict = await PriceValidator.checkPriceConflict(body, id);
    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          message: "存在重叠的价格区间",
          conflicts: conflict.conflicts.map(p => ({
            id: p.id,
            serviceType: p.serviceType,
            originRegion: p.originRegion?.name || "全部",
            destinationRegion: p.destinationRegion?.name || "全部",
            weightRange: `${p.weightStart || 0} - ${p.weightEnd || '不限'}`,
            volumeRange: `${p.volumeStart || 0} - ${p.volumeEnd || '不限'}`,
            effectiveDate: p.effectiveDate,
            expiryDate: p.expiryDate
          }))
        },
        { status: 409 }
      );
    }

    // 更新价格记录
    const price = await prisma.price.update({
      where: { id },
      data: {
        serviceId: body.serviceId,
        serviceType: body.serviceType,
        originRegionId: body.originRegionId,
        destinationRegionId: body.destinationRegionId,
        weightStart: body.weightStart,
        weightEnd: body.weightEnd,
        volumeStart: body.volumeStart,
        volumeEnd: body.volumeEnd,
        price: body.price,
        currency: body.currency,
        priceUnit: body.priceUnit,
        effectiveDate: new Date(body.effectiveDate),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        isCurrent: body.isCurrent,
        remark: body.remark,
        organizationId: body.organizationId,
        priceType: body.priceType || existingPrice.priceType,
        visibilityType: body.visibilityType || existingPrice.visibilityType,
        visibleOrgs: body.visibleOrgs || existingPrice.visibleOrgs,
      }
    });

    // 创建价格历史记录
    await prisma.priceHistory.create({
      data: {
        priceId: price.id,
        serviceId: body.serviceId,
        serviceType: body.serviceType,
        originRegionId: body.originRegionId,
        destinationRegionId: body.destinationRegionId,
        weightStart: body.weightStart,
        weightEnd: body.weightEnd,
        volumeStart: body.volumeStart,
        volumeEnd: body.volumeEnd,
        price: body.price,
        currency: body.currency,
        priceUnit: body.priceUnit,
        effectiveDate: new Date(body.effectiveDate),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        remark: body.remark,
        organizationId: body.organizationId || existingPrice.organizationId,
        priceType: body.priceType || existingPrice.priceType,
        visibilityType: body.visibilityType || existingPrice.visibilityType,
        visibleOrgs: body.visibleOrgs || existingPrice.visibleOrgs,
        operationType: "修改",
        operatedBy: session.user.id,
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "价格管理",
        operation: "更新价格",
        method: "PUT",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error("更新价格错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "价格管理",
          operation: "更新价格",
          method: "PUT",
          requestUrl: request.url,
          requestParams: JSON.stringify(await request.json()),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "更新价格失败" },
      { status: 500 }
    );
  }
}

// 删除价格
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查是否有删除价格的权限
    const hasPermission = session.user.permissions.includes("price:delete");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除价格的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);

    // 检查价格是否存在
    const existingPrice = await prisma.price.findUnique({
      where: { id }
    });

    if (!existingPrice) {
      return NextResponse.json(
        { success: false, message: "价格不存在" },
        { status: 404 }
      );
    }

    // 创建价格历史记录
    await prisma.priceHistory.create({
      data: {
        priceId: existingPrice.id,
        serviceId: existingPrice.serviceId,
        serviceType: existingPrice.serviceType,
        originRegionId: existingPrice.originRegionId,
        destinationRegionId: existingPrice.destinationRegionId,
        weightStart: existingPrice.weightStart,
        weightEnd: existingPrice.weightEnd,
        volumeStart: existingPrice.volumeStart,
        volumeEnd: existingPrice.volumeEnd,
        price: existingPrice.price,
        currency: existingPrice.currency,
        priceUnit: existingPrice.priceUnit,
        effectiveDate: existingPrice.effectiveDate,
        expiryDate: existingPrice.expiryDate,
        remark: existingPrice.remark,
        organizationId: existingPrice.organizationId,
        priceType: existingPrice.priceType,
        visibilityType: existingPrice.visibilityType,
        visibleOrgs: existingPrice.visibleOrgs,
        operationType: "删除",
        operatedBy: session.user.id,
      }
    });

    // 删除价格记录
    await prisma.price.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "价格管理",
        operation: "删除价格",
        method: "DELETE",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      message: "价格删除成功"
    });
  } catch (error) {
    console.error("删除价格错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "价格管理",
          operation: "删除价格",
          method: "DELETE",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "删除价格失败" },
      { status: 500 }
    );
  }
}
