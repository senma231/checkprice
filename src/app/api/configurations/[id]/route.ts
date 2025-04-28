import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取单个配置详情
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
    
    // 检查是否有查看配置的权限
    const hasPermission = session.user.permissions.includes("config:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看配置的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 获取配置详情
    const configuration = await prisma.configuration.findUnique({
      where: { id }
    });
    
    if (!configuration) {
      return NextResponse.json(
        { success: false, message: "配置不存在" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error("获取配置详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取配置详情失败" },
      { status: 500 }
    );
  }
}

// 更新配置
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
    
    // 检查是否有编辑配置的权限
    const hasPermission = session.user.permissions.includes("config:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑配置的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    const body = await request.json();
    
    // 检查配置是否存在
    const existingConfig = await prisma.configuration.findUnique({
      where: { id }
    });
    
    if (!existingConfig) {
      return NextResponse.json(
        { success: false, message: "配置不存在" },
        { status: 404 }
      );
    }
    
    // 更新配置
    const configuration = await prisma.configuration.update({
      where: { id },
      data: {
        configValue: body.configValue,
        description: body.description,
        status: body.status
      }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "系统管理",
        operation: "更新配置",
        method: "PUT",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error("更新配置错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "系统管理",
          operation: "更新配置",
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
      { success: false, message: "更新配置失败" },
      { status: 500 }
    );
  }
}

// 删除配置
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
    
    // 检查是否有编辑配置的权限
    const hasPermission = session.user.permissions.includes("config:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑配置的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 检查配置是否存在
    const existingConfig = await prisma.configuration.findUnique({
      where: { id }
    });
    
    if (!existingConfig) {
      return NextResponse.json(
        { success: false, message: "配置不存在" },
        { status: 404 }
      );
    }
    
    // 删除配置
    await prisma.configuration.delete({
      where: { id }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "系统管理",
        operation: "删除配置",
        method: "DELETE",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "配置删除成功"
    });
  } catch (error) {
    console.error("删除配置错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "系统管理",
          operation: "删除配置",
          method: "DELETE",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: "删除配置失败" },
      { status: 500 }
    );
  }
}
