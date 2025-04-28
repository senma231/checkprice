import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

// 获取角色权限
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

    // 检查是否有查看权限的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions.includes("role:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看权限的权限" },
          { status: 403 }
        );
      }
    }

    // 确保params.id是异步获取的
    const { id: idString } = params;
    const id = parseInt(idString);

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, message: "角色不存在" },
        { status: 404 }
      );
    }

    // 获取角色权限
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      include: {
        permission: true
      }
    });

    // 获取所有权限
    const allPermissions = await prisma.permission.findMany({
      where: { status: 1 },
      orderBy: { id: "asc" }
    });

    // 构建权限树
    const permissionGroups: Record<string, any> = {};

    allPermissions.forEach(permission => {
      const [group] = permission.code.split(":");

      if (!permissionGroups[group]) {
        permissionGroups[group] = {
          key: group,
          title: getGroupTitle(group),
          children: []
        };
      }

      permissionGroups[group].children.push({
        key: permission.code,
        title: permission.name,
        isLeaf: true
      });
    });

    const permissionTree = Object.values(permissionGroups);

    // 获取已分配的权限代码
    const assignedPermissionCodes = rolePermissions.map(rp => rp.permission.code);

    return NextResponse.json({
      success: true,
      data: {
        permissionTree,
        assignedPermissionCodes
      }
    });
  } catch (error) {
    console.error("获取角色权限错误:", error);
    return NextResponse.json(
      { success: false, message: "获取角色权限失败" },
      { status: 500 }
    );
  }
}

// 更新角色权限
export async function POST(
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

    // 检查是否有分配权限的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions.includes("permission:assign");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有分配权限的权限" },
          { status: 403 }
        );
      }
    }

    // 确保params.id是异步获取的
    const { id: idString } = params;
    const id = parseInt(idString);
    const body = await request.json();
    const { permissionCodes } = body;

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, message: "角色不存在" },
        { status: 404 }
      );
    }

    // 开始事务
    await prisma.$transaction(async (tx) => {
      // 删除现有权限
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // 如果有权限代码，则添加新权限
      if (permissionCodes && permissionCodes.length > 0) {
        // 获取权限ID
        const permissions = await tx.permission.findMany({
          where: {
            code: {
              in: permissionCodes
            }
          }
        });

        // 创建角色权限关联
        const rolePermissions = permissions.map(permission => ({
          roleId: id,
          permissionId: permission.id
        }));

        await tx.rolePermission.createMany({
          data: rolePermissions
        });
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "角色管理",
        operation: "分配权限",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      message: "权限分配成功"
    });
  } catch (error) {
    console.error("分配权限错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "角色管理",
          operation: "分配权限",
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
      { success: false, message: "分配权限失败" },
      { status: 500 }
    );
  }
}

// 获取权限组标题
function getGroupTitle(group: string): string {
  const groupTitles: Record<string, string> = {
    user: "用户管理",
    role: "角色权限管理",
    permission: "权限管理",
    org: "组织管理",
    price: "价格管理",
    config: "系统配置",
    log: "日志管理",
    data: "数据分析"
  };

  return groupTitles[group] || group;
}
