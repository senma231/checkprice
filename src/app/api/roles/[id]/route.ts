import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取单个角色详情
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
    
    // 检查是否有查看角色的权限
    const hasPermission = session.user.permissions.includes("role:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看角色的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 获取角色详情
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!role) {
      return NextResponse.json(
        { success: false, message: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 格式化角色数据
    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      permissions: role.rolePermissions.map(rp => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code
      })),
      permissionCodes: role.rolePermissions.map(rp => rp.permission.code)
    };
    
    return NextResponse.json({
      success: true,
      data: formattedRole
    });
  } catch (error) {
    console.error("获取角色详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取角色详情失败" },
      { status: 500 }
    );
  }
}

// 更新角色
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
    
    // 检查是否有编辑角色的权限
    const hasPermission = session.user.permissions.includes("role:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑角色的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    const body = await request.json();
    
    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return NextResponse.json(
        { success: false, message: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 检查角色名称是否已被其他角色使用
    if (body.name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name: body.name,
          id: { not: id }
        }
      });
      
      if (nameExists) {
        return NextResponse.json(
          { success: false, message: "角色名称已被其他角色使用" },
          { status: 400 }
        );
      }
    }
    
    // 更新角色
    const role = await prisma.role.update({
      where: { id },
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
        operation: "更新角色",
        method: "PUT",
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
    console.error("更新角色错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "角色管理",
          operation: "更新角色",
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
      { success: false, message: "更新角色失败" },
      { status: 500 }
    );
  }
}

// 删除角色
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
    
    // 检查是否有删除角色的权限
    const hasPermission = session.user.permissions.includes("role:delete");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除角色的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 不允许删除超级管理员角色
    if (id === 1) {
      return NextResponse.json(
        { success: false, message: "不能删除超级管理员角色" },
        { status: 403 }
      );
    }
    
    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return NextResponse.json(
        { success: false, message: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 检查角色是否已分配给用户
    const userRoleCount = await prisma.userRole.count({
      where: { roleId: id }
    });
    
    if (userRoleCount > 0) {
      return NextResponse.json(
        { success: false, message: "角色已分配给用户，无法删除" },
        { status: 400 }
      );
    }
    
    // 删除角色权限关联
    await prisma.rolePermission.deleteMany({
      where: { roleId: id }
    });
    
    // 删除角色
    await prisma.role.delete({
      where: { id }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "角色管理",
        operation: "删除角色",
        method: "DELETE",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "角色删除成功"
    });
  } catch (error) {
    console.error("删除角色错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "角色管理",
          operation: "删除角色",
          method: "DELETE",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: "删除角色失败" },
      { status: 500 }
    );
  }
}
