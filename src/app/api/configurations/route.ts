import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 获取配置列表
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
    
    // 检查是否有查看配置的权限
    const hasPermission = session.user.permissions.includes("config:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看配置的权限" },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "system";
    
    // 系统配置和业务配置的键前缀
    const systemPrefixes = ["SYSTEM_", "COMPANY_", "CONTACT_"];
    const businessPrefixes = ["DEFAULT_", "PRICE_", "WEIGHT_", "VOLUME_"];
    
    // 根据类型筛选配置
    const where: any = {};
    if (type === "system") {
      where.OR = systemPrefixes.map(prefix => ({
        configKey: {
          startsWith: prefix
        }
      }));
    } else if (type === "business") {
      where.OR = businessPrefixes.map(prefix => ({
        configKey: {
          startsWith: prefix
        }
      }));
    }
    
    // 获取配置列表
    const configurations = await prisma.configuration.findMany({
      where,
      orderBy: {
        configKey: "asc"
      }
    });
    
    return NextResponse.json({
      success: true,
      data: configurations
    });
  } catch (error) {
    console.error("获取配置列表错误:", error);
    return NextResponse.json(
      { success: false, message: "获取配置列表失败" },
      { status: 500 }
    );
  }
}

// 创建配置
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
    
    // 检查是否有编辑配置的权限
    const hasPermission = session.user.permissions.includes("config:edit");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有编辑配置的权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // 检查配置键是否已存在
    const existingConfig = await prisma.configuration.findUnique({
      where: { configKey: body.configKey }
    });
    
    if (existingConfig) {
      return NextResponse.json(
        { success: false, message: "配置键已存在" },
        { status: 400 }
      );
    }
    
    // 创建配置
    const configuration = await prisma.configuration.create({
      data: {
        configKey: body.configKey,
        configValue: body.configValue,
        description: body.description,
        status: body.status
      }
    });
    
    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "系统管理",
        operation: "创建配置",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });
    
    return NextResponse.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error("创建配置错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "系统管理",
          operation: "创建配置",
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
      { success: false, message: "创建配置失败" },
      { status: 500 }
    );
  }
}
