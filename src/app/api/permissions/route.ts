import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取权限列表
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

    const { searchParams } = new URL(request.url);
    const treeMode = searchParams.get("treeMode") === "true";

    // 获取所有权限
    const permissions = await prisma.permission.findMany({
      where: { status: 1 },
      orderBy: { id: "asc" }
    });

    if (treeMode) {
      // 构建权限树
      const permissionGroups: Record<string, any> = {};

      permissions.forEach(permission => {
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
          id: permission.id,
          code: permission.code,
          description: permission.description,
          isLeaf: true
        });
      });

      const permissionTree = Object.values(permissionGroups);

      return NextResponse.json({
        success: true,
        data: permissionTree
      });
    } else {
      return NextResponse.json({
        success: true,
        data: permissions
      });
    }
  } catch (error) {
    console.error("获取权限列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取权限列表失败" },
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
