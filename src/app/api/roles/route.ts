import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取角色列表
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

    // 检查是否有查看角色的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("role:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看角色的权限" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // 执行查询
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "asc"
        }
      }),
      prisma.role.count()
    ]);

    return NextResponse.json({
      success: true,
      data: roles,
      pagination: {
        current: page,
        pageSize,
        total
      }
    });
  } catch (error) {
    console.error("获取角色列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取角色列表失败" },
      { status: 500 }
    );
  }
}

// 创建角色
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

    // 检查是否有创建角色的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions.includes("role:create");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有创建角色的权限" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // 检查角色名称是否已存在
    const existingRole = await prisma.role.findFirst({
      where: { name: body.name }
    });

    if (existingRole) {
      return NextResponse.json(
        { success: false, message: "角色名称已存在" },
        { status: 400 }
      );
    }

    // 创建角色
    const role = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        status: body.status
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "角色管理",
        operation: "创建角色",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error("创建角色错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "角色管理",
          operation: "创建角色",
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
      { success: false, message: "创建角色失败" },
      { status: 500 }
    );
  }
}
