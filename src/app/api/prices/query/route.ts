import { NextRequest, NextResponse } from "next/server";
import { prisma, queryOptimizer } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      serviceType,
      serviceId,
      originRegionId,
      destinationRegionId,
      weight,
      volume,
      queryDate = new Date().toISOString().split('T')[0],
      currency = "CNY",
      page = 1,
      pageSize = 10,
      sortField = "price",
      sortOrder = "asc",
      // 高级筛选参数
      priceMin,
      priceMax,
      validityStart,
      validityEnd,
      visibilityType,
      isExpiringSoon,
      organizationId,
      createdBy
    } = body;

    // 记录查询日志
    const userType = session?.user?.userType || 3; // 3表示匿名用户
    const userId = session?.user?.id || null;

    const logEntry = await prisma.queryLog.create({
      data: {
        userId,
        userType,
        queryType: "PRICE_QUERY",
        queryParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        executionTime: 0, // 将在查询完成后更新
      }
    });

    const startTime = Date.now();

    // 使用查询优化器执行查询，传递session信息
    const result = await queryOptimizer.optimizePriceQuery({
      serviceType,
      serviceId,
      originRegionId,
      destinationRegionId,
      weight,
      volume,
      queryDate,
      currency,
      page,
      pageSize,
      sortField,
      sortOrder,
      // 高级筛选参数
      priceMin,
      priceMax,
      validityStart,
      validityEnd,
      visibilityType,
      isExpiringSoon,
      organizationId,
      createdBy
    }, session);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // 更新查询日志
    await prisma.queryLog.update({
      where: { id: logEntry.id },
      data: {
        resultCount: result.pagination.total,
        executionTime
      }
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("价格查询错误:", error);
    return NextResponse.json(
      { success: false, message: "价格查询失败" },
      { status: 500 }
    );
  }
}
