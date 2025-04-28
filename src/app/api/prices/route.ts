import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PriceValidator } from "@/lib/price-validator";

// 获取价格列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查价格查看权限
    const canViewExternal = session.user.permissions.includes("price:view:external") ||
                           session.user.permissions.includes("price:view");
    const canViewInternal = session.user.permissions.includes("price:view:internal") ||
                           session.user.permissions.includes("price:view");

    if (!canViewExternal && !canViewInternal) {
      return NextResponse.json(
        { success: false, message: "没有查看价格的权限" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // 构建查询条件
    const where: any = {};

    if (serviceType) {
      where.serviceType = parseInt(serviceType);
    }

    // 获取其他查询参数
    const priceType = searchParams.get("priceType");
    const organizationId = searchParams.get("organizationId");
    const originRegionId = searchParams.get("originRegionId");
    const destinationRegionId = searchParams.get("destinationRegionId");

    // 根据权限过滤价格类型
    if (priceType) {
      where.priceType = parseInt(priceType);
    } else {
      // 如果没有指定价格类型，则根据权限过滤
      if (canViewInternal && canViewExternal) {
        // 可以查看所有价格，不需要额外过滤
      } else if (canViewInternal) {
        where.priceType = 2; // 只能查看内部价格
      } else if (canViewExternal) {
        where.priceType = 1; // 只能查看外部价格
      }
    }

    if (organizationId) {
      where.organizationId = parseInt(organizationId);
    }

    if (originRegionId) {
      where.originRegionId = parseInt(originRegionId);
    }

    if (destinationRegionId) {
      where.destinationRegionId = parseInt(destinationRegionId);
    }

    // 添加可见性过滤
    // 1. 如果用户是超级管理员或管理员，可以查看所有价格
    // 2. 否则，只能查看对自己可见的价格
    if (!session.user.permissions.includes("price:manage:org") &&
        !session.user.roles.includes("超级管理员") &&
        !session.user.roles.includes("管理员")) {

      where.OR = [
        { visibilityType: 1 }, // 所有组织可见
        {
          visibilityType: 2,
          visibleOrgs: { contains: session.user.organizationId?.toString() }
        }, // 指定组织可见且包含当前用户组织
        {
          visibilityType: 3,
          organizationId: session.user.organizationId
        } // 仅创建组织可见且是当前用户组织
      ];
    }

    // 执行查询
    const [prices, total] = await Promise.all([
      prisma.price.findMany({
        where,
        include: {
          originRegion: true,
          destinationRegion: true,
          organization: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          updatedAt: "desc"
        }
      }),
      prisma.price.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        prices,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error) {
    console.error("获取价格列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格列表失败" },
      { status: 500 }
    );
  }
}

// 创建价格
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查是否有创建价格的权限
    const hasPermission = session.user.permissions.includes("price:create");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有创建价格的权限" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 验证价格数据
    const validation = PriceValidator.validatePriceData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: "价格数据无效", errors: validation.errors },
        { status: 400 }
      );
    }

    // 检查价格冲突
    const conflict = await PriceValidator.checkPriceConflict(body);
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

    // 创建价格记录
    const price = await prisma.price.create({
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
        createdBy: session.user.id,
        organizationId: body.organizationId,
        priceType: body.priceType || 1, // 默认为对外价格
        visibilityType: body.visibilityType || 1, // 默认为所有组织可见
        visibleOrgs: body.visibleOrgs, // 可见组织ID列表
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
        organizationId: body.organizationId,
        priceType: body.priceType || 1,
        visibilityType: body.visibilityType || 1,
        visibleOrgs: body.visibleOrgs,
        operationType: "新增",
        operatedBy: session.user.id,
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "价格管理",
        operation: "创建价格",
        method: "POST",
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
    console.error("创建价格错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "价格管理",
          operation: "创建价格",
          method: "POST",
          requestUrl: request.url,
          requestParams: JSON.stringify(await request.json()),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "创建价格失败" },
      { status: 500 }
    );
  }
}
