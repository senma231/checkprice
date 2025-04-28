import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取组织列表
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

    // 检查是否有查看组织的权限
    // 临时登录方案，如果用户名是 admin，直接允许
    if (session.user.username === 'admin') {
      console.log("临时登录方案，跳过权限检查");
    } else {
      const hasPermission = session.user.permissions?.includes("org:view");
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: "没有查看组织的权限" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const treeMode = searchParams.get("treeMode") === "true";

    if (treeMode) {
      // 获取树形结构的组织数据
      const rootOrganizations = await prisma.organization.findMany({
        where: { parentId: null },
        orderBy: { id: "asc" }
      });

      // 递归获取子组织
      const organizationTree = await Promise.all(
        rootOrganizations.map(async (org) => {
          return {
            ...org,
            children: await getChildOrganizations(org.id)
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: organizationTree
      });
    } else {
      // 获取扁平结构的组织数据
      const organizations = await prisma.organization.findMany({
        orderBy: [
          { level: "asc" },
          { id: "asc" }
        ]
      });

      return NextResponse.json({
        success: true,
        data: organizations
      });
    }
  } catch (error) {
    console.error("获取组织列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取组织列表失败" },
      { status: 500 }
    );
  }
}

// 创建组织
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

    // 检查是否有创建组织的权限
    const hasPermission = session.user.permissions.includes("org:create");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有创建组织的权限" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 检查组织名称是否已存在
    const existingOrg = await prisma.organization.findFirst({
      where: { name: body.name }
    });

    if (existingOrg) {
      return NextResponse.json(
        { success: false, message: "组织名称已存在" },
        { status: 400 }
      );
    }

    // 如果有父组织，检查父组织是否存在
    if (body.parentId) {
      const parentOrg = await prisma.organization.findUnique({
        where: { id: body.parentId }
      });

      if (!parentOrg) {
        return NextResponse.json(
          { success: false, message: "父组织不存在" },
          { status: 400 }
        );
      }
    }

    // 创建组织
    const organization = await prisma.organization.create({
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
        operation: "创建组织",
        method: "POST",
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
    console.error("创建组织错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "组织管理",
          operation: "创建组织",
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
      { success: false, message: "创建组织失败" },
      { status: 500 }
    );
  }
}

// 递归获取子组织
async function getChildOrganizations(parentId: number) {
  const children = await prisma.organization.findMany({
    where: { parentId },
    orderBy: { id: "asc" }
  });

  return await Promise.all(
    children.map(async (child) => {
      return {
        ...child,
        children: await getChildOrganizations(child.id)
      };
    })
  );
}
