import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取日志列表
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

    // 检查是否有查看日志的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("log:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看日志的权限" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const module = searchParams.get("module");
    const operation = searchParams.get("operation");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 构建查询条件
    const where: any = {};

    if (module) {
      where.module = module;
    }

    if (operation) {
      where.operation = {
        contains: operation
      };
    }

    if (status !== null && status !== undefined) {
      where.status = parseInt(status);
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // 执行查询
    try {
      const [logs, total] = await Promise.all([
        prisma.operationLog.findMany({
          where,
          orderBy: {
            createdAt: "desc"
          },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.operationLog.count({ where })
      ]);

      // 如果有用户ID，获取用户信息
      const userIds = logs.filter(log => log.userId).map(log => log.userId);
      let users = {};

      if (userIds.length > 0) {
        const userRecords = await prisma.user.findMany({
          where: {
            id: {
              in: userIds
            }
          },
          select: {
            id: true,
            username: true,
            realName: true
          }
        });

        // 转换为对象格式，方便查找
        users = userRecords.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }

      // 格式化日志数据
      const formattedLogs = logs.map(log => ({
        id: log.id,
        userId: log.userId,
        user: log.userId ? users[log.userId] || {
          id: log.userId,
          username: "未知用户",
          realName: "未知用户"
        } : null,
        module: log.module,
        operation: log.operation,
        method: log.method,
        requestUrl: log.requestUrl,
        requestParams: log.requestParams,
        ipAddress: log.ipAddress,
        executionTime: log.executionTime,
        status: log.status,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
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
    } catch (queryError) {
      console.error("查询日志错误:", queryError);
      throw queryError;
    }

    // 这部分代码已经被替换，不再需要
  } catch (error) {
    console.error("获取日志列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取日志列表失败" },
      { status: 500 }
    );
  }
}
