import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取公告列表
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

    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get("dashboard") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const status = searchParams.get("status");

    // 仪表盘公告查看不需要特定权限，所有已登录用户都可以查看
    // 如果不是仪表盘请求，则检查权限
    if (!dashboard && session.user.permissions) {
      // 检查是否有查看公告的权限
      const hasPermission = session.user.permissions.includes("announcement:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看公告的权限" },
          { status: 403 }
        );
      }
    }

    // 构建查询条件
    const where: any = {};

    if (status !== null && status !== undefined) {
      where.status = parseInt(status);
    }

    // 如果是仪表盘请求，只返回当前有效的公告
    if (dashboard) {
      const now = new Date();
      where.status = 1;
      where.publishTime = {
        lte: now
      };
      where.OR = [
        { expireTime: null },
        { expireTime: { gte: now } }
      ];
    }

    // 执行查询
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              realName: true
            }
          }
        },
        orderBy: dashboard
          ? { publishTime: "desc" }
          : { updatedAt: "desc" },
        skip: dashboard ? 0 : (page - 1) * pageSize,
        take: dashboard ? 10 : pageSize // 增加获取的公告数量，以便前端分页
      }),
      prisma.announcement.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        announcements,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error) {
    console.error("获取公告列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取公告列表失败" },
      { status: 500 }
    );
  }
}

// 创建公告
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

    // 检查是否有创建公告的权限
    // 如果用户有权限列表，则检查权限
    if (session.user.permissions) {
      // 临时登录方案，如果用户名是 admin，直接允许
      if (session.user.username === 'admin') {
        console.log("临时登录方案，跳过权限检查");
      } else {
        const hasPermission = session.user.permissions.includes("announcement:create");
        if (!hasPermission) {
          return NextResponse.json(
            { success: false, message: "没有创建公告的权限" },
            { status: 403 }
          );
        }
      }
    } else {
      console.log("临时登录方案，跳过权限检查");
    }

    const body = await request.json();

    // 验证必填字段
    if (!body.title || !body.content || !body.publishTime) {
      return NextResponse.json(
        { success: false, message: "标题、内容和发布时间不能为空" },
        { status: 400 }
      );
    }

    // 检查是否存在用户ID
    let userId = session.user.id;

    // 如果没有用户ID，使用默认值1
    if (!userId) {
      console.log("使用默认用户ID");
      userId = 1;
    }

    // 检查用户是否存在
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!userExists) {
        console.log("用户不存在，创建临时用户");
        // 创建临时用户
        await prisma.user.create({
          data: {
            id: 1,
            username: "admin",
            password: "admin123", // 实际应用中应该加密
            email: "admin@example.com",
            realName: "系统管理员",
            userType: 1,
            status: 1
          }
        });
        userId = 1;
      }
    } catch (userError) {
      console.error("检查/创建用户错误:", userError);
      // 如果创建用户失败，使用默认值1
      userId = 1;
    }

    // 创建公告
    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        publishTime: new Date(body.publishTime),
        expireTime: body.expireTime ? new Date(body.expireTime) : null,
        status: body.status || 1,
        createdBy: userId
      }
    });

    try {
      // 记录操作日志
      await prisma.operationLog.create({
        data: {
          userId: userId,
          module: "公告管理",
          operation: "创建公告",
          method: "POST",
          requestUrl: request.url,
          requestParams: JSON.stringify(body),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 1,
        }
      });
    } catch (logError) {
      console.error("记录操作日志失败:", logError);
      // 继续执行，不因为日志记录失败而中断流程
    }

    return NextResponse.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error("创建公告错误:", error);
    return NextResponse.json(
      { success: false, message: "创建公告失败" },
      { status: 500 }
    );
  }
}
