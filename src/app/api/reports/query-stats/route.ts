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
    
    // 检查是否有查看报表的权限
    const hasPermission = session.user.permissions.includes("report:view");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有查看报表的权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { startDate, endDate, timeUnit = 'day' } = body;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "缺少必要的查询参数" },
        { status: 400 }
      );
    }
    
    // 解析日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 设置为当天结束时间
    
    // 获取时间段内的查询日志
    const queryLogs = await prisma.queryLog.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            userType: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // 生成时间序列
    const timePoints = generateTimePoints(start, end, timeUnit);
    
    // 按时间单位聚合数据
    const aggregatedData = aggregateByTimeUnit(queryLogs, timePoints, timeUnit);
    
    // 计算查询类型分布
    const queryTypes = {};
    queryLogs.forEach(log => {
      if (!queryTypes[log.queryType]) {
        queryTypes[log.queryType] = 0;
      }
      queryTypes[log.queryType]++;
    });
    
    // 获取热门查询
    const topQueries = await getTopQueries(start, end);
    
    // 计算汇总数据
    const summary = {
      totalQueries: queryLogs.length,
      avgResponseTime: queryLogs.length > 0 
        ? Math.round(queryLogs.reduce((sum, log) => sum + (log.executionTime || 0), 0) / queryLogs.length) 
        : 0,
      successRate: queryLogs.length > 0 
        ? Math.round((queryLogs.filter(log => log.resultCount > 0).length / queryLogs.length) * 100) 
        : 0,
      uniqueUsers: new Set(queryLogs.map(log => log.userId).filter(id => id !== null)).size
    };
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          dates: timePoints,
          counts: aggregatedData.counts,
          responseTimes: aggregatedData.responseTimes,
          queryTypes
        },
        topQueries,
        summary
      }
    });
  } catch (error) {
    console.error("获取查询统计错误:", error);
    return NextResponse.json(
      { success: false, message: "获取查询统计失败" },
      { status: 500 }
    );
  }
}

// 生成时间点序列
function generateTimePoints(start: Date, end: Date, timeUnit: string): string[] {
  const result = [];
  const current = new Date(start);
  
  while (current <= end) {
    let timePoint;
    
    switch (timeUnit) {
      case 'hour':
        timePoint = `${current.getFullYear()}-${padZero(current.getMonth() + 1)}-${padZero(current.getDate())} ${padZero(current.getHours())}:00`;
        current.setHours(current.getHours() + 1);
        break;
      case 'day':
        timePoint = `${current.getFullYear()}-${padZero(current.getMonth() + 1)}-${padZero(current.getDate())}`;
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        const weekStart = new Date(current);
        timePoint = `${weekStart.getFullYear()}-${padZero(weekStart.getMonth() + 1)}-${padZero(weekStart.getDate())}`;
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        timePoint = `${current.getFullYear()}-${padZero(current.getMonth() + 1)}`;
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        timePoint = `${current.getFullYear()}-${padZero(current.getMonth() + 1)}-${padZero(current.getDate())}`;
        current.setDate(current.getDate() + 1);
    }
    
    result.push(timePoint);
  }
  
  return result;
}

// 数字补零
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

// 按时间单位聚合数据
function aggregateByTimeUnit(logs, timePoints, timeUnit) {
  const counts = new Array(timePoints.length).fill(0);
  const responseTimes = new Array(timePoints.length).fill(0);
  const responseCounts = new Array(timePoints.length).fill(0);
  
  logs.forEach(log => {
    const date = new Date(log.createdAt);
    let timePoint;
    
    switch (timeUnit) {
      case 'hour':
        timePoint = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:00`;
        break;
      case 'day':
        timePoint = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
        break;
      case 'week':
        // 简化处理，使用日期代表周
        timePoint = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
        break;
      case 'month':
        timePoint = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}`;
        break;
      default:
        timePoint = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
    }
    
    const index = timePoints.indexOf(timePoint);
    if (index !== -1) {
      counts[index]++;
      if (log.executionTime) {
        responseTimes[index] += log.executionTime;
        responseCounts[index]++;
      }
    }
  });
  
  // 计算平均响应时间
  for (let i = 0; i < timePoints.length; i++) {
    if (responseCounts[i] > 0) {
      responseTimes[i] = Math.round(responseTimes[i] / responseCounts[i]);
    }
  }
  
  return { counts, responseTimes };
}

// 获取热门查询
async function getTopQueries(start: Date, end: Date) {
  // 使用原始SQL查询获取热门查询
  const topQueries = await prisma.$queryRaw`
    SELECT 
      "queryType",
      "queryParams",
      COUNT(*) as count,
      AVG("executionTime") as "avgResponseTime"
    FROM 
      "query_logs"
    WHERE 
      "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY 
      "queryType", "queryParams"
    ORDER BY 
      count DESC
    LIMIT 10
  `;
  
  return topQueries;
}
