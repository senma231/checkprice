import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 刷新配置缓存
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
    
    // 检查是否有编辑配置的权限
    const hasPermission = session.user.permissions.includes("config:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑配置的权限" },
        { status: 403 }
      );
    }
    
    // 在实际应用中，这里应该清除配置缓存
    // 由于这是一个演示应用，我们只是模拟刷新缓存
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "系统管理",
        operation: "刷新配置缓存",
        method: "POST",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "配置缓存刷新成功"
    });
  } catch (error) {
    console.error("刷新配置缓存错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "系统管理",
          operation: "刷新配置缓存",
          method: "POST",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: "刷新配置缓存失败" },
      { status: 500 }
    );
  }
}
