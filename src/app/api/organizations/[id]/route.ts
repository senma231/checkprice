import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取单个组织详情
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
    
    // 检查是否有查看组织的权限
    const hasPermission = session.user.permissions.includes("org:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看组织的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 获取组织详情
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true
      }
    });
    
    if (!organization) {
      return NextResponse.json(
        { success: false, message: "组织不存在" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error("获取组织详情错误:", error);
    return NextResponse.json(
      { success: false, message: "获取组织详情失败" },
      { status: 500 }
    );
  }
}

// 更新组织
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
    
    // 检查是否有编辑组织的权限
    const hasPermission = session.user.permissions.includes("org:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑组织的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    const body = await request.json();
    
    // 检查组织是否存在
    const existingOrg = await prisma.organization.findUnique({
      where: { id }
    });
    
    if (!existingOrg) {
      return NextResponse.json(
        { success: false, message: "组织不存在" },
        { status: 404 }
      );
    }
    
    // 检查组织名称是否已被其他组织使用
    if (body.name !== existingOrg.name) {
      const nameExists = await prisma.organization.findFirst({
        where: {
          name: body.name,
          id: { not: id }
        }
      });
      
      if (nameExists) {
        return NextResponse.json(
          { success: false, message: "组织名称已被其他组织使用" },
          { status: 400 }
        );
      }
    }
    
    // 检查是否将组织设为自己的子组织
    if (body.parentId === id) {
      return NextResponse.json(
        { success: false, message: "不能将组织设为自己的子组织" },
        { status: 400 }
      );
    }
    
    // 检查是否将组织设为其子组织的子组织
    if (body.parentId) {
      const isChildOrg = await isChildOrganization(id, body.parentId);
      if (isChildOrg) {
        return NextResponse.json(
          { success: false, message: "不能将组织设为其子组织的子组织" },
          { status: 400 }
        );
      }
    }
    
    // 更新组织
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: body.name,
        parentId: body.parentId,
        level: body.level,
        description: body.description,
        status: body.status
      }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "组织管理",
        operation: "更新组织",
        method: "PUT",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error("更新组织错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "组织管理",
          operation: "更新组织",
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
      { success: false, message: "更新组织失败" },
      { status: 500 }
    );
  }
}

// 删除组织
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
    
    // 检查是否有删除组织的权限
    const hasPermission = session.user.permissions.includes("org:delete");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有删除组织的权限" },
        { status: 403 }
      );
    }
    
    const id = parseInt(params.id);
    
    // 不允许删除根组织
    if (id === 1) {
      return NextResponse.json(
        { success: false, message: "不能删除根组织" },
        { status: 403 }
      );
    }
    
    // 检查组织是否存在
    const existingOrg = await prisma.organization.findUnique({
      where: { id }
    });
    
    if (!existingOrg) {
      return NextResponse.json(
        { success: false, message: "组织不存在" },
        { status: 404 }
      );
    }
    
    // 检查组织是否有子组织
    const childCount = await prisma.organization.count({
      where: { parentId: id }
    });
    
    if (childCount > 0) {
      return NextResponse.json(
        { success: false, message: "组织下有子组织，无法删除" },
        { status: 400 }
      );
    }
    
    // 检查组织是否有用户
    const userCount = await prisma.user.count({
      where: { organizationId: id }
    });
    
    if (userCount > 0) {
      return NextResponse.json(
        { success: false, message: "组织下有用户，无法删除" },
        { status: 400 }
      );
    }
    
    // 删除组织
    await prisma.organization.delete({
      where: { id }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "组织管理",
        operation: "删除组织",
        method: "DELETE",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "组织删除成功"
    });
  } catch (error) {
    console.error("删除组织错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "组织管理",
          operation: "删除组织",
          method: "DELETE",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: "删除组织失败" },
      { status: 500 }
    );
  }
}

// 检查是否是子组织
async function isChildOrganization(parentId: number, childId: number): Promise<boolean> {
  const children = await prisma.organization.findMany({
    where: { parentId }
  });
  
  if (children.some(child => child.id === childId)) {
    return true;
  }
  
  for (const child of children) {
    if (await isChildOrganization(child.id, childId)) {
      return true;
    }
  }
  
  return false;
}
