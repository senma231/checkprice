import { NextRequest, NextResponse } from "next/server";
import { prisma, queryOptimizer } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取服务类型列表
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const status = searchParams.get("status");

    // 构建查询条件
    const queryParams: any = { parentId };

    // 如果指定了状态，添加到查询条件
    if (status !== null && status !== undefined) {
      queryParams.status = status;
    }

    // 使用查询优化器获取服务类型数据
    const serviceTypes = await queryOptimizer.optimizeServiceTypesQuery(queryParams);

    return NextResponse.json({
      success: true,
      data: serviceTypes
    });
  } catch (error) {
    console.error("获取服务类型错误:", error);
    return NextResponse.json(
      { success: false, message: "获取服务类型失败" },
      { status: 500 }
    );
  }
}

// 创建服务类型
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

    // 检查是否有创建服务类型的权限
    const hasPermission = session.user.permissions.includes("service-type:create") ||
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有创建服务类型的权限" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, message: "名称和编码为必填项" },
        { status: 400 }
      );
    }

    // 检查编码是否已存在
    const existingServiceType = await prisma.logisticsServiceType.findUnique({
      where: { code: body.code }
    });

    if (existingServiceType) {
      return NextResponse.json(
        { success: false, message: "服务类型编码已存在" },
        { status: 409 }
      );
    }

    // 创建服务类型
    const serviceType = await prisma.logisticsServiceType.create({
      data: {
        name: body.name,
        code: body.code,
        parentId: body.parentId || null,
        description: body.description || null,
        status: body.status || 1
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "创建服务类型",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: serviceType
    });
  } catch (error) {
    console.error("创建服务类型错误:", error);
    return NextResponse.json(
      { success: false, message: "创建服务类型失败" },
      { status: 500 }
    );
  }
}
