import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取单个公告详情
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

    // 单个公告详情查看不需要特定权限，所有已登录用户都可以查看

    const id = parseInt(params.id);

    // 获取公告详情
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            realName: true
          }
        }
      }
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "公告不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error("获取公告详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取公告详情失败" },
      { status: 500 }
    );
  }
}

// 更新公告
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

    // 检查是否有编辑公告的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("announcement:edit");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有编辑公告的权限" },
          { status: 403 }
        );
      }
    }

    const id = parseInt(params.id);
    const body = await request.json();

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, message: "公告不存在" },
        { status: 404 }
      );
    }

    // 验证必填字段
    if (!body.title || !body.content || !body.publishTime) {
      return NextResponse.json(
        { success: false, message: "标题、内容和发布时间不能为空" },
        { status: 400 }
      );
    }

    // 更新公告
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        publishTime: new Date(body.publishTime),
        expireTime: body.expireTime ? new Date(body.expireTime) : null,
        status: body.status
      }
    });

    // 检查用户是否存在
    let userId = session.user.id || 1;
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

    try {
      // 记录操作日志
      await prisma.operationLog.create({
        data: {
          userId: userId,
          module: "公告管理",
          operation: "更新公告",
          method: "PUT",
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
    console.error("更新公告错误:", error);
    return NextResponse.json(
      { success: false, message: "更新公告失败" },
      { status: 500 }
    );
  }
}

// 删除公告
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

    // 检查是否有删除公告的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("announcement:delete");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有删除公告的权限" },
          { status: 403 }
        );
      }
    }

    const id = parseInt(params.id);

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, message: "公告不存在" },
        { status: 404 }
      );
    }

    // 删除公告
    await prisma.announcement.delete({
      where: { id }
    });

    // 检查用户是否存在
    let userId = session.user.id || 1;
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

    try {
      // 记录操作日志
      await prisma.operationLog.create({
        data: {
          userId: userId,
          module: "公告管理",
          operation: "删除公告",
          method: "DELETE",
          requestUrl: request.url,
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
      message: "公告删除成功"
    });
  } catch (error) {
    console.error("删除公告错误:", error);
    return NextResponse.json(
      { success: false, message: "删除公告失败" },
      { status: 500 }
    );
  }
}
