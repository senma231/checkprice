import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取操作日志列表
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
      username, 
      module, 
      operation, 
      status, 
      dateRange,
      page = 1,
      pageSize = 10
    } = body;
    
    // 构建查询条件
    const where: any = {};
    
    if (username) {
      where.user = {
        username: {
          contains: username
        }
      };
    }
    
    if (module) {
      where.module = module;
    }
    
    if (operation) {
      where.operation = {
        contains: operation
      };
    }
    
    if (status !== undefined) {
      where.status = parseInt(status);
    }
    
    if (dateRange && dateRange.length === 2) {
      where.createdAt = {
        gte: new Date(dateRange[0]),
        lte: new Date(dateRange[1])
      };
    }
    
    // 执行查询
    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              realName: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.operationLog.count({ where })
    ]);
    
    // 格式化日志数据
    const formattedLogs = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user?.username || null,
      module: log.module,
      operation: log.operation,
      method: log.method,
      requestUrl: log.requestUrl,
      requestParams: log.requestParams,
      ipAddress: log.ipAddress,
      executionTime: log.executionTime,
      status: log.status,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString().replace('T', ' ').substring(0, 19)
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error) {
    console.error("获取操作日志列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取操作日志列表失败" },
      { status: 500 }
    );
  }
}
