import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取价格分析数据
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
    
    // 检查是否有查看报表的权限
    const hasPermission = session.user.permissions.includes("report:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看报表的权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      dateRange, 
      serviceType, 
      serviceId, 
      originRegionId, 
      destinationRegionId 
    } = body;
    
    if (!dateRange || dateRange.length !== 2) {
      return NextResponse.json(
        { success: false, message: "缺少必要的查询参数" },
        { status: 400 }
      );
    }
    
    // 解析日期范围
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    endDate.setHours(23, 59, 59, 999); // 设置为当天结束时间
    
    // 构建查询条件
    const where: any = {
      operatedAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (serviceType) {
      where.serviceType = parseInt(serviceType);
    }
    
    if (serviceId) {
      where.serviceId = parseInt(serviceId);
    }
    
    if (originRegionId) {
      where.originRegionId = parseInt(originRegionId);
    }
    
    if (destinationRegionId) {
      where.destinationRegionId = parseInt(destinationRegionId);
    }
    
    // 获取价格历史记录
    const priceHistory = await prisma.priceHistory.findMany({
      where,
      include: {
        originRegion: true,
        destinationRegion: true
      },
      orderBy: {
        operatedAt: 'asc'
      }
    });
    
    // 如果没有数据，返回空结果
    if (priceHistory.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          trends: {
            dates: [],
            series: []
          },
          distribution: {
            ranges: [],
            counts: []
          },
          regionComparison: {
            regions: [],
            minPrices: [],
            avgPrices: [],
            maxPrices: []
          },
          priceChanges: []
        }
      });
    }
    
    // 生成价格趋势数据
    const trendsData = generateTrendsData(priceHistory);
    
    // 生成价格分布数据
    const distributionData = generateDistributionData(priceHistory);
    
    // 生成区域价格对比数据
    const regionComparisonData = generateRegionComparisonData(priceHistory);
    
    // 生成价格变动明细
    const priceChanges = generatePriceChanges(priceHistory);
    
    return NextResponse.json({
      success: true,
      data: {
        trends: trendsData,
        distribution: distributionData,
        regionComparison: regionComparisonData,
        priceChanges
      }
    });
  } catch (error) {
    console.error("获取价格分析错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格分析失败" },
      { status: 500 }
    );
  }
}

// 生成价格趋势数据
function generateTrendsData(priceHistory) {
  // 按服务和路线分组
  const groupedData = {};
  const allDates = new Set();
  
  priceHistory.forEach(record => {
    // 格式化日期
    const dateStr = new Date(record.operatedAt).toISOString().split('T')[0];
    allDates.add(dateStr);
    
    // 生成服务路线标识
    const routeKey = `${record.serviceId}-${record.originRegionId || 0}-${record.destinationRegionId || 0}`;
    const routeName = `${record.serviceId}-${record.originRegion?.name || '未知'} 到 ${record.destinationRegion?.name || '未知'}`;
    
    if (!groupedData[routeKey]) {
      groupedData[routeKey] = {
        name: routeName,
        data: {}
      };
    }
    
    // 记录每天的最新价格
    groupedData[routeKey].data[dateStr] = parseFloat(record.price.toString());
  });
  
  // 排序日期
  const sortedDates = Array.from(allDates).sort();
  
  // 构建系列数据
  const series = Object.values(groupedData).map(route => {
    const data = sortedDates.map(date => route.data[date] || null);
    return {
      name: route.name,
      data
    };
  });
  
  return {
    dates: sortedDates,
    series
  };
}

// 生成价格分布数据
function generateDistributionData(priceHistory) {
  // 获取所有价格
  const prices = priceHistory.map(record => parseFloat(record.price.toString()));
  
  // 如果没有价格数据，返回空结果
  if (prices.length === 0) {
    return {
      ranges: [],
      counts: []
    };
  }
  
  // 计算价格范围
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // 计算区间数量（最多10个区间）
  const rangeCount = Math.min(10, Math.ceil((maxPrice - minPrice) / 10));
  
  // 计算区间大小
  const rangeSize = (maxPrice - minPrice) / rangeCount;
  
  // 初始化区间和计数
  const ranges = [];
  const counts = new Array(rangeCount).fill(0);
  
  // 生成区间标签
  for (let i = 0; i < rangeCount; i++) {
    const start = minPrice + i * rangeSize;
    const end = minPrice + (i + 1) * rangeSize;
    ranges.push(`${start.toFixed(2)}-${end.toFixed(2)}`);
  }
  
  // 统计每个区间的价格数量
  prices.forEach(price => {
    const index = Math.min(rangeCount - 1, Math.floor((price - minPrice) / rangeSize));
    counts[index]++;
  });
  
  return {
    ranges,
    counts
  };
}

// 生成区域价格对比数据
function generateRegionComparisonData(priceHistory) {
  // 按目的地区域分组
  const regionData = {};
  
  priceHistory.forEach(record => {
    const regionId = record.destinationRegionId;
    const regionName = record.destinationRegion?.name || '未知';
    const price = parseFloat(record.price.toString());
    
    if (!regionId) return;
    
    if (!regionData[regionId]) {
      regionData[regionId] = {
        name: regionName,
        prices: []
      };
    }
    
    regionData[regionId].prices.push(price);
  });
  
  // 计算每个区域的最低价、平均价和最高价
  const regions = [];
  const minPrices = [];
  const avgPrices = [];
  const maxPrices = [];
  
  Object.values(regionData).forEach((region: any) => {
    regions.push(region.name);
    minPrices.push(Math.min(...region.prices));
    avgPrices.push(parseFloat((region.prices.reduce((sum, price) => sum + price, 0) / region.prices.length).toFixed(2)));
    maxPrices.push(Math.max(...region.prices));
  });
  
  return {
    regions,
    minPrices,
    avgPrices,
    maxPrices
  };
}

// 生成价格变动明细
function generatePriceChanges(priceHistory) {
  // 按价格ID分组
  const priceChanges = {};
  
  priceHistory.forEach(record => {
    if (!priceChanges[record.priceId]) {
      priceChanges[record.priceId] = {
        id: record.priceId,
        serviceName: `服务${record.serviceId}`,
        route: `${record.originRegion?.name || '未知'} 到 ${record.destinationRegion?.name || '未知'}`,
        initialPrice: parseFloat(record.price.toString()),
        currentPrice: parseFloat(record.price.toString()),
        currency: record.currency,
        unit: record.priceUnit,
        changeCount: 0,
        lastChangeTime: record.operatedAt
      };
    } else {
      // 更新当前价格和变动次数
      const change = priceChanges[record.priceId];
      change.currentPrice = parseFloat(record.price.toString());
      change.changeCount++;
      change.lastChangeTime = record.operatedAt;
    }
  });
  
  // 计算变动幅度
  const result = Object.values(priceChanges).map((change: any) => {
    const changeRate = parseFloat(((change.currentPrice - change.initialPrice) / change.initialPrice * 100).toFixed(2));
    return {
      ...change,
      changeRate
    };
  });
  
  return result;
}
