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
    
    // 检查是否有数据分析权限
    const hasPermission = session.user.permissions.includes("data:analysis");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有数据分析权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      serviceTypeId, 
      serviceId, 
      regionId, 
      dateRange 
    } = body;
    
    // 构建查询条件
    const where: any = {};
    
    if (serviceTypeId) {
      where.serviceType = parseInt(serviceTypeId);
    }
    
    if (serviceId) {
      where.serviceId = parseInt(serviceId);
    }
    
    if (regionId) {
      where.OR = [
        { originRegionId: parseInt(regionId) },
        { destinationRegionId: parseInt(regionId) }
      ];
    }
    
    if (dateRange && dateRange.length === 2) {
      where.effectiveDate = {
        gte: new Date(dateRange[0]),
        lte: new Date(dateRange[1])
      };
    }
    
    // 获取价格数据
    const prices = await prisma.price.findMany({
      where,
      include: {
        originRegion: true,
        destinationRegion: true
      },
      orderBy: {
        effectiveDate: "asc"
      }
    });
    
    // 处理价格数据，按月份分组
    const pricesByMonth: Record<string, Record<string, number[]>> = {};
    const serviceNames: Record<string, string> = {};
    
    prices.forEach(price => {
      const effectiveDate = price.effectiveDate;
      const month = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}`;
      
      const serviceName = `${price.serviceId}-${price.originRegionId}-${price.destinationRegionId}`;
      const serviceDisplayName = `${getServiceName(price.serviceId, price.serviceType)} (${price.originRegion?.name || '未知'}-${price.destinationRegion?.name || '未知'})`;
      
      serviceNames[serviceName] = serviceDisplayName;
      
      if (!pricesByMonth[month]) {
        pricesByMonth[month] = {};
      }
      
      if (!pricesByMonth[month][serviceName]) {
        pricesByMonth[month][serviceName] = [];
      }
      
      pricesByMonth[month][serviceName].push(Number(price.price));
    });
    
    // 计算每个月份的平均价格
    const months = Object.keys(pricesByMonth).sort();
    const services = Object.keys(serviceNames);
    
    const series = services.map(service => {
      const data = months.map(month => {
        const prices = pricesByMonth[month][service] || [];
        return prices.length > 0 
          ? Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100
          : null;
      });
      
      return {
        name: serviceNames[service],
        data
      };
    });
    
    // 过滤掉没有数据的系列
    const filteredSeries = series.filter(s => s.data.some(d => d !== null));
    
    return NextResponse.json({
      success: true,
      data: {
        dates: months,
        series: filteredSeries
      }
    });
  } catch (error) {
    console.error("获取价格趋势数据错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格趋势数据失败" },
      { status: 500 }
    );
  }
}

// 获取服务名称
function getServiceName(serviceId: number, serviceType: number): string {
  // 这里应该从数据库中获取服务名称
  // 为了简化，这里使用硬编码的服务名称
  const serviceNames: Record<number, string> = {
    1: "标准海运",
    2: "快速空运",
    3: "FBA海运头程",
    4: "FBA空运头程",
    5: "贴标服务"
  };
  
  return serviceNames[serviceId] || `服务${serviceId}`;
}
