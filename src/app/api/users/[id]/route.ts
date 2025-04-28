import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

// 获取单个用户详情
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
    
    // 检查是否有查看用户的权限
    const hasPermission = session.user.permissions.includes("user:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看用户的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 获取用户详情
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 格式化用户数据
    const formattedUser = {
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
      roles: user.userRoles.map(ur => ur.role.name),
      roleIds: user.userRoles.map(ur => ur.role.id)
    };
    
    return NextResponse.json({
      success: true,
      data: formattedUser
    });
  } catch (error) {
    console.error("获取用户详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取用户详情失败" },
      { status: 500 }
    );
  }
}

// 更新用户
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
    
    // 检查是否有编辑用户的权限
    const hasPermission = session.user.permissions.includes("user:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑用户的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    const body = await request.json();
    
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 检查邮箱是否已被其他用户使用
    if (body.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: body.email,
          id: { not: id }
        }
      });
      
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: "邮箱已被其他用户使用" },
          { status: 400 }
        );
      }
    }
    
    // 更新用户数据
    const updateData: any = {
      email: body.email,
      phone: body.phone,
      realName: body.realName,
      organizationId: body.organizationId,
      status: body.status,
      userType: body.userType
    };
    
    // 如果提供了新密码，则更新密码
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }
    
    // 更新用户
    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    // 更新用户角色
    if (body.roleIds && Array.isArray(body.roleIds)) {
      // 删除现有角色
      await prisma.userRole.deleteMany({
        where: { userId: id }
      });
      
      // 添加新角色
      if (body.roleIds.length > 0) {
        const userRoles = body.roleIds.map((roleId: number) => ({
          userId: id,
          roleId
        }));
        
        await prisma.userRole.createMany({
          data: userRoles
        });
      }
    }
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "用户管理",
        operation: "更新用户",
        method: "PUT",
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
    console.error("更新用户错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "用户管理",
          operation: "更新用户",
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
      { success: false, message: "更新用户失败" },
      { status: 500 }
    );
  }
}

// 删除用户
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
    
    // 检查是否有删除用户的权限
    const hasPermission = session.user.permissions.includes("user:delete");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除用户的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 不允许删除超级管理员
    if (id === 1) {
      return NextResponse.json(
        { success: false, message: "不能删除超级管理员" },
        { status: 403 }
      );
    }
    
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 删除用户角色关联
    await prisma.userRole.deleteMany({
      where: { userId: id }
    });
    
    // 删除用户
    await prisma.user.delete({
      where: { id }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "用户管理",
        operation: "删除用户",
        method: "DELETE",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "用户删除成功"
    });
  } catch (error) {
    console.error("删除用户错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "用户管理",
          operation: "删除用户",
          method: "DELETE",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: "删除用户失败" },
      { status: 500 }
    );
  }
}
