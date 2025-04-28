import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

// 获取用户列表
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

    // 检查是否有查看用户的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("user:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看用户的权限" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // 执行查询
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: {
          organization: true,
          userRoles: {
            include: {
              role: true
            }
          }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "asc"
        }
      }),
      prisma.user.count()
    ]);

    // 格式化用户数据
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      status: user.status,
      userType: user.userType,
      lastLoginTime: user.lastLoginTime,
      roles: user.userRoles.map(ur => ur.role.name)
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error) {
    console.error("获取用户列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取用户列表失败" },
      { status: 500 }
    );
  }
}

// 创建用户
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

    // 检查是否有创建用户的权限
    const hasPermission = session.user.permissions.includes("user:create");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有创建用户的权限" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 检查用户名和邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: body.username },
          { email: body.email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "用户名或邮箱已存在" },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashedPassword,
        email: body.email,
        phone: body.phone,
        realName: body.realName,
        organizationId: body.organizationId,
        status: body.status,
        userType: body.userType
      }
    });

    // 分配角色
    if (body.roleIds && body.roleIds.length > 0) {
      const userRoles = body.roleIds.map((roleId: number) => ({
        userId: user.id,
        roleId
      }));

      await prisma.userRole.createMany({
        data: userRoles
      });
    }

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "用户管理",
        operation: "创建用户",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("创建用户错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "用户管理",
          operation: "创建用户",
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
      { success: false, message: "创建用户失败" },
      { status: 500 }
    );
  }
}
