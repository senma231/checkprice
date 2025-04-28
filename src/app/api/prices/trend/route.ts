import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取价格趋势数据
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
    
    const body = await request.json();
    const { 
      serviceType, 
      serviceId, 
      originRegionId, 
      destinationRegionId, 
      weight,
      dateRange 
    } = body;
    
    if (!serviceType || !dateRange || dateRange.length !== 2) {
      return NextResponse.json(
        { success: false, message: "缺少必要的查询参数" },
        { status: 400 }
      );
    }
    
    // 解析日期范围
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    
    // 解析重量范围
    let weightStart, weightEnd;
    if (weight) {
      const weightRanges = {
        "0-10": { start: 0, end: 10 },
        "10-50": { start: 10, end: 50 },
        "50-100": { start: 50, end: 100 },
        "100-500": { start: 100, end: 500 },
        "500+": { start: 500, end: null }
      };
      
      if (weightRanges[weight]) {
        weightStart = weightRanges[weight].start;
        weightEnd = weightRanges[weight].end;
      }
    }
    
    // 构建查询条件
    const where: any = {
      serviceType: parseInt(serviceType),
      effectiveDate: {
        lte: endDate
      },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: startDate } }
      ]
    };
    
    if (serviceId) {
      where.serviceId = parseInt(serviceId);
    }
    
    if (originRegionId) {
      where.originRegionId = parseInt(originRegionId);
    }
    
    if (destinationRegionId) {
      where.destinationRegionId = parseInt(destinationRegionId);
    }
    
    if (weightStart !== undefined) {
      where.weightStart = { lte: weightStart };
      if (weightEnd !== null) {
        where.weightEnd = { gte: weightEnd };
      }
    }
    
    // 获取价格历史数据
    const priceHistory = await prisma.priceHistory.findMany({
      where: {
        ...where,
        operatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        originRegion: true,
        destinationRegion: true
      },
      orderBy: {
        operatedAt: "asc"
      }
    });
    
    // 如果没有数据，返回空结果
    if (priceHistory.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          dates: [],
          series: []
        }
      });
    }
    
    // 处理数据，按服务分组
    const groupedData = {};
    const allDates = new Set();
    
    priceHistory.forEach(record => {
      // 格式化日期
      const dateStr = new Date(record.operatedAt).toISOString().split('T')[0];
      allDates.add(dateStr);
      
      // 生成服务名称
      const serviceName = `${record.serviceId}-${record.originRegion?.name || '未知'} 到 ${record.destinationRegion?.name || '未知'}`;
      
      if (!groupedData[serviceName]) {
        groupedData[serviceName] = {};
      }
      
      groupedData[serviceName][dateStr] = parseFloat(record.price.toString());
    });
    
    // 排序日期
    const sortedDates = Array.from(allDates).sort();
    
    // 构建系列数据
    const series = Object.keys(groupedData).map(serviceName => {
      const data = sortedDates.map(date => groupedData[serviceName][date] || null);
      return {
        name: serviceName,
        data
      };
    });
    
    // 记录查询日志
    await prisma.queryLog.create({
      data: {
        userId: session.user.id,
        userType: session.user.userType,
        queryType: "PRICE_TREND",
        queryParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        resultCount: priceHistory.length,
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        dates: sortedDates,
        series
      }
    });
  } catch (error) {
    console.error("获取价格趋势错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格趋势失败" },
      { status: 500 }
    );
  }
}
