import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取服务列表
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
    const serviceTypeId = searchParams.get("serviceTypeId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const keyword = searchParams.get("keyword");

    // 构建查询条件
    const where: any = {};

    // 如果指定了状态，则按状态筛选
    if (status !== null && status !== undefined) {
      where.status = parseInt(status);
    }

    // 如果指定了服务类型，则按服务类型筛选
    if (serviceTypeId) {
      where.serviceTypeId = parseInt(serviceTypeId);
    }

    // 如果指定了关键词，则按名称或编码筛选
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } }
      ];
    }

    // 查询服务总数
    const total = await prisma.logisticsService.count({ where });

    // 查询服务数据
    const services = await prisma.logisticsService.findMany({
      where,
      include: {
        serviceType: true
      },
      orderBy: {
        id: "asc"
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        current: page,
        pageSize,
        total
      }
    });
  } catch (error) {
    console.error("获取服务错误:", error);
    return NextResponse.json(
      { success: false, message: "获取服务失败" },
      { status: 500 }
    );
  }
}

// 创建服务
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

    // 检查是否有创建服务的权限
    const hasPermission = session.user.permissions.includes("service:create") ||
                         session.user.permissions.includes("admin");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有创建服务的权限" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.code || !body.serviceTypeId) {
      return NextResponse.json(
        { success: false, message: "名称、编码和服务类型为必填项" },
        { status: 400 }
      );
    }

    // 检查编码是否已存在
    const existingService = await prisma.logisticsService.findUnique({
      where: { code: body.code }
    });

    if (existingService) {
      return NextResponse.json(
        { success: false, message: "服务编码已存在" },
        { status: 409 }
      );
    }

    // 检查服务类型是否存在
    const serviceType = await prisma.logisticsServiceType.findUnique({
      where: { id: body.serviceTypeId }
    });

    if (!serviceType) {
      return NextResponse.json(
        { success: false, message: "所选服务类型不存在" },
        { status: 400 }
      );
    }

    // 创建服务
    const service = await prisma.logisticsService.create({
      data: {
        name: body.name,
        code: body.code,
        serviceTypeId: body.serviceTypeId,
        provider: body.provider || "",
        description: body.description || null,
        status: body.status || 1,
        createdBy: session.user?.id
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "服务管理",
        operation: "创建服务",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    return NextResponse.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("创建服务错误:", error);
    return NextResponse.json(
      { success: false, message: "创建服务失败" },
      { status: 500 }
    );
  }
}
