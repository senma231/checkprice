import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

// 获取单个服务类型详情
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

    // 获取服务类型详情
    const serviceType = await prisma.logisticsServiceType.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true
      }
    });

    if (!serviceType) {
      return NextResponse.json(
        { success: false, message: "服务类型不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serviceType
    });
  } catch (error) {
    console.error("获取服务类型详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取服务类型详情失败" },
      { status: 500 }
    );
  }
}

// 更新服务类型
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

    // 检查是否有编辑服务类型的权限
    const hasPermission = session.user.permissions.includes("service-type:edit") || 
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑服务类型的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const body = await request.json();

    // 检查服务类型是否存在
    const existingServiceType = await prisma.logisticsServiceType.findUnique({
      where: { id }
    });

    if (!existingServiceType) {
      return NextResponse.json(
        { success: false, message: "服务类型不存在" },
        { status: 404 }
      );
    }

    // 如果更改了编码，检查新编码是否已存在
    if (body.code && body.code !== existingServiceType.code) {
      const codeExists = await prisma.logisticsServiceType.findFirst({
        where: {
          code: body.code,
          id: { not: id }
        }
      });

      if (codeExists) {
        return NextResponse.json(
          { success: false, message: "服务类型编码已被其他服务类型使用" },
          { status: 409 }
        );
      }
    }

    // 更新服务类型
    const serviceType = await prisma.logisticsServiceType.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        parentId: body.parentId,
        description: body.description,
        status: body.status
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "更新服务类型",
        method: "PUT",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: serviceType
    });
  } catch (error) {
    console.error("更新服务类型错误:", error);
    return NextResponse.json(
      { success: false, message: "更新服务类型失败" },
      { status: 500 }
    );
  }
}

// 删除服务类型
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

    // 检查是否有删除服务类型的权限
    const hasPermission = session.user.permissions.includes("service-type:delete") || 
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除服务类型的权限" },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);

    // 检查服务类型是否存在
    const existingServiceType = await prisma.logisticsServiceType.findUnique({
      where: { id },
      include: {
        children: true,
        services: true
      }
    });

    if (!existingServiceType) {
      return NextResponse.json(
        { success: false, message: "服务类型不存在" },
        { status: 404 }
      );
    }

    // 检查是否有子服务类型
    if (existingServiceType.children.length > 0) {
      return NextResponse.json(
        { success: false, message: "该服务类型下有子服务类型，无法删除" },
        { status: 400 }
      );
    }

    // 检查是否有关联的服务
    if (existingServiceType.services.length > 0) {
      return NextResponse.json(
        { success: false, message: "该服务类型下有关联的服务，无法删除" },
        { status: 400 }
      );
    }

    // 删除服务类型
    await prisma.logisticsServiceType.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "删除服务类型",
        method: "DELETE",
        requestUrl: request.url,
        requestParams: JSON.stringify({ id }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      message: "服务类型删除成功"
    });
  } catch (error) {
    console.error("删除服务类型错误:", error);
    return NextResponse.json(
      { success: false, message: "删除服务类型失败" },
      { status: 500 }
    );
  }
}
