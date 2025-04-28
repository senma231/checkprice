import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 导出日志
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
    
    // 检查是否有查看日志的权限
    const hasPermission = session.user.permissions.includes("log:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看日志的权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      logType, // "operation" 或 "query"
      ...filters 
    } = body;
    
    // 在实际应用中，这里应该根据过滤条件查询日志，并生成CSV或Excel文件
    // 由于这是一个演示应用，我们只是模拟导出功能
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "系统管理",
        operation: `导出${logType === "operation" ? "操作" : "查询"}日志`,
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "日志导出成功",
      data: {
        // 在实际应用中，这里应该返回文件下载链接
        downloadUrl: `/api/downloads/logs/${logType}_${Date.now()}.csv`
      }
    });
  } catch (error) {
    console.error("导出日志错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "系统管理",
          operation: "导出日志",
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
      { success: false, message: "导出日志失败" },
      { status: 500 }
    );
  }
}
