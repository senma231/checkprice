import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

// 获取单个服务详情
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

    // 获取服务详情
    const service = await prisma.logisticsService.findUnique({
      where: { id },
      include: {
        serviceType: true,
        creator: {
          select: {
            id: true,
            username: true,
            realName: true
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "服务不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("获取服务详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取服务详情失败" },
      { status: 500 }
    );
  }
}

// 更新服务
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

    // 检查是否有编辑服务的权限
    const hasPermission = session.user.permissions.includes("service:edit") ||
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑服务的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const body = await request.json();

    // 检查服务是否存在
    const existingService = await prisma.logisticsService.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { success: false, message: "服务不存在" },
        { status: 404 }
      );
    }

    // 如果更改了编码，检查新编码是否已存在
    if (body.code && body.code !== existingService.code) {
      const codeExists = await prisma.logisticsService.findFirst({
        where: {
          code: body.code,
          id: { not: id }
        }
      });

      if (codeExists) {
        return NextResponse.json(
          { success: false, message: "服务编码已被其他服务使用" },
          { status: 409 }
        );
      }
    }

    // 如果更改了服务类型，检查新服务类型是否存在
    if (body.serviceTypeId && body.serviceTypeId !== existingService.serviceTypeId) {
      const serviceTypeExists = await prisma.logisticsServiceType.findUnique({
        where: { id: body.serviceTypeId }
      });

      if (!serviceTypeExists) {
        return NextResponse.json(
          { success: false, message: "所选服务类型不存在" },
          { status: 400 }
        );
      }
    }

    // 更新服务
    const service = await prisma.logisticsService.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        serviceTypeId: body.serviceTypeId,
        provider: body.provider || "",
        description: body.description,
        status: body.status,
        updatedBy: session.user?.id,
        updatedAt: new Date()
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "更新服务",
        method: "PUT",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("更新服务错误:", error);
    return NextResponse.json(
      { success: false, message: "更新服务失败" },
      { status: 500 }
    );
  }
}

// 删除服务
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

    // 检查是否有删除服务的权限
    const hasPermission = session.user.permissions.includes("service:delete") ||
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除服务的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);

    // 检查服务是否存在
    const existingService = await prisma.logisticsService.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { success: false, message: "服务不存在" },
        { status: 404 }
      );
    }

    // 检查是否有关联的价格
    const relatedPrices = await prisma.price.count({
      where: { serviceId: id }
    });

    if (relatedPrices > 0) {
      return NextResponse.json(
        { success: false, message: "该服务下有关联的价格，无法删除" },
        { status: 400 }
      );
    }

    // 删除服务
    await prisma.logisticsService.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "删除服务",
        method: "DELETE",
        requestUrl: request.url,
        requestParams: JSON.stringify({ id }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      message: "服务删除成功"
    });
  } catch (error) {
    console.error("删除服务错误:", error);
    return NextResponse.json(
      { success: false, message: "删除服务失败" },
      { status: 500 }
    );
  }
}
