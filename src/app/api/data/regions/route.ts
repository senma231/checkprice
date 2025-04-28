import { NextRequest, NextResponse } from "next/server";
import { prisma, queryOptimizer } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取区域列表
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
    const level = searchParams.get("level");

    // 使用查询优化器获取区域数据
    const regions = await queryOptimizer.optimizeRegionsQuery({
      parentId,
      level
    });

    return NextResponse.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error("获取区域错误:", error);
    return NextResponse.json(
      { success: false, message: "获取区域失败" },
      { status: 500 }
    );
  }
}
