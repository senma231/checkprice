import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 获取查询统计数据
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
      queryType, 
      userType, 
      dateRange 
    } = body;
    
    // 构建查询条件
    const where: any = {};
    
    if (queryType) {
      where.queryType = queryType;
    }
    
    if (userType) {
      where.userType = parseInt(userType);
    }
    
    if (dateRange && dateRange.length === 2) {
      where.createdAt = {
        gte: new Date(dateRange[0]),
        lte: new Date(dateRange[1])
      };
    } else {
      // 默认查询最近30天的数据
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // 获取查询日志
    const queryLogs = await prisma.queryLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    // 按日期分组统计查询次数
    const queryCountByDate: Record<string, Record<string, number>> = {};
    const queryTypes: Set<string> = new Set();
    
    queryLogs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      const queryParams = JSON.parse(log.queryParams);
      const queryTypeName = getQueryTypeName(log.queryType, queryParams);
      
      queryTypes.add(queryTypeName);
      
      if (!queryCountByDate[date]) {
        queryCountByDate[date] = {};
      }
      
      if (!queryCountByDate[date][queryTypeName]) {
        queryCountByDate[date][queryTypeName] = 0;
      }
      
      queryCountByDate[date][queryTypeName]++;
    });
    
    // 按查询类型统计总次数
    const queryTypeStats: Record<string, number> = {};
    queryTypes.forEach(type => {
      queryTypeStats[type] = 0;
    });
    
    Object.values(queryCountByDate).forEach(counts => {
      Object.entries(counts).forEach(([type, count]) => {
        queryTypeStats[type] += count;
      });
    });
    
    // 按用户类型统计查询次数
    const userTypeStats: Record<string, number> = {
      "内部用户": 0,
      "外部用户": 0,
      "匿名用户": 0
    };
    
    queryLogs.forEach(log => {
      if (log.userType === 1) {
        userTypeStats["内部用户"]++;
      } else if (log.userType === 2) {
        userTypeStats["外部用户"]++;
      } else {
        userTypeStats["匿名用户"]++;
      }
    });
    
    // 格式化查询日志数据
    const formattedLogs = queryLogs.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user?.username || null,
      userType: log.userType,
      queryType: log.queryType,
      queryParams: log.queryParams,
      resultCount: log.resultCount || 0,
      executionTime: log.executionTime || 0,
      ipAddress: log.ipAddress || "unknown",
      createdAt: log.createdAt.toISOString().replace('T', ' ').substring(0, 19)
    }));
    
    // 准备图表数据
    const dates = Object.keys(queryCountByDate).sort();
    const queryTypeArray = Array.from(queryTypes);
    
    const series = queryTypeArray.map(type => {
      const data = dates.map(date => queryCountByDate[date][type] || 0);
      
      return {
        name: type,
        data
      };
    });
    
    const pieData = Object.entries(queryTypeStats).map(([name, value]) => ({
      name,
      value
    }));
    
    const userTypePieData = Object.entries(userTypeStats).map(([name, value]) => ({
      name,
      value
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        dates,
        series,
        pieData,
        userTypeData: userTypePieData,
        logs: formattedLogs
      }
    });
  } catch (error) {
    console.error("获取查询统计数据错误:", error);
    return NextResponse.json(
      { success: false, message: "获取查询统计数据失败" },
      { status: 500 }
    );
  }
}

// 获取查询类型名称
function getQueryTypeName(queryType: string, queryParams: any): string {
  if (queryType === "PRICE_QUERY") {
    if (queryParams.serviceType === 1) {
      return "传统物流查询";
    } else if (queryParams.serviceType === 2) {
      return "FBA头程查询";
    } else if (queryParams.serviceType === 3) {
      return "增值服务查询";
    }
  }
  
  return queryType;
}
