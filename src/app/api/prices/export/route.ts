import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

// 导出价格数据
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
    
    // 检查是否有导出价格的权限
    const hasExportPermission = session.user.permissions.includes("price:export") || 
                               session.user.permissions.includes("price:export:batch");
    if (!hasExportPermission) {
      return NextResponse.json(
        { success: false, message: "没有导出价格的权限" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { filters = {}, exportAll = false } = body;
    
    // 构建查询条件
    const where: any = { ...filters };
    
    // 检查内部价格查看权限
    const canViewInternal = session.user.permissions.includes("price:view:internal") || 
                           session.user.permissions.includes("price:view");
    // 检查外部价格查看权限
    const canViewExternal = session.user.permissions.includes("price:view:external") || 
                           session.user.permissions.includes("price:view");
    
    // 根据权限过滤价格类型
    if (!canViewInternal && !canViewExternal) {
      return NextResponse.json(
        { success: false, message: "没有查看价格的权限" },
        { status: 403 }
      );
    } else if (canViewInternal && !canViewExternal) {
      where.priceType = 2; // 只能导出内部价格
    } else if (!canViewInternal && canViewExternal) {
      where.priceType = 1; // 只能导出外部价格
    }
    
    // 添加可见性过滤
    // 1. 如果用户是超级管理员或管理员，可以查看所有价格
    // 2. 否则，只能查看对自己可见的价格
    if (!session.user.permissions.includes("price:manage:org") && 
        !session.user.roles.includes("超级管理员") && 
        !session.user.roles.includes("管理员")) {
      
      where.OR = [
        { visibilityType: 1 }, // 所有组织可见
        { 
          visibilityType: 2,
          visibleOrgs: { contains: session.user.organizationId?.toString() }
        }, // 指定组织可见且包含当前用户组织
        {
          visibilityType: 3,
          organizationId: session.user.organizationId
        } // 仅创建组织可见且是当前用户组织
      ];
    }
    
    // 获取价格数据
    const prices = await prisma.price.findMany({
      where,
      include: {
        originRegion: true,
        destinationRegion: true,
        organization: true,
        creator: {
          select: {
            id: true,
            username: true,
            realName: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    
    if (prices.length === 0) {
      return NextResponse.json(
        { success: false, message: "没有符合条件的价格数据" },
        { status: 404 }
      );
    }
    
    // 准备导出数据
    const exportData = prices.map(price => ({
      "服务类型": price.serviceType === 1 ? "传统物流" : price.serviceType === 2 ? "FBA头程物流" : "增值服务",
      "服务ID": price.serviceId,
      "始发地": price.originRegion?.name || "全部",
      "目的地": price.destinationRegion?.name || "全部",
      "重量范围(kg)": price.weightStart && price.weightEnd ? 
        `${price.weightStart} - ${price.weightEnd}` : 
        price.weightStart ? `${price.weightStart} 以上` : 
        price.weightEnd ? `0 - ${price.weightEnd}` : "不限",
      "体积范围(m³)": price.volumeStart && price.volumeEnd ? 
        `${price.volumeStart} - ${price.volumeEnd}` : 
        price.volumeStart ? `${price.volumeStart} 以上` : 
        price.volumeEnd ? `0 - ${price.volumeEnd}` : "不限",
      "价格": price.price,
      "币种": price.currency,
      "计价单位": price.priceUnit,
      "生效日期": price.effectiveDate.toISOString().split('T')[0],
      "失效日期": price.expiryDate ? price.expiryDate.toISOString().split('T')[0] : "长期有效",
      "价格类型": price.priceType === 1 ? "对外价格" : "内部价格",
      "可见性": price.visibilityType === 1 ? "所有组织可见" : 
               price.visibilityType === 2 ? "指定组织可见" : "仅创建组织可见",
      "所属组织": price.organization?.name || "无",
      "创建人": price.creator?.realName || price.creator?.username || "未知",
      "创建时间": price.createdAt.toISOString().replace('T', ' ').substring(0, 19),
      "更新时间": price.updatedAt.toISOString().replace('T', ' ').substring(0, 19),
      "备注": price.remark || ""
    }));
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 服务类型
      { wch: 8 }, // 服务ID
      { wch: 15 }, // 始发地
      { wch: 15 }, // 目的地
      { wch: 15 }, // 重量范围
      { wch: 15 }, // 体积范围
      { wch: 10 }, // 价格
      { wch: 8 }, // 币种
      { wch: 10 }, // 计价单位
      { wch: 12 }, // 生效日期
      { wch: 12 }, // 失效日期
      { wch: 10 }, // 价格类型
      { wch: 15 }, // 可见性
      { wch: 15 }, // 所属组织
      { wch: 12 }, // 创建人
      { wch: 20 }, // 创建时间
      { wch: 20 }, // 更新时间
      { wch: 30 }, // 备注
    ];
    worksheet['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "价格数据");
    
    // 生成Excel文件
    const fileName = `价格数据_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`;
    const filePath = path.join(process.cwd(), "public", "exports", fileName);
    
    // 确保导出目录存在
    await fs.mkdir(path.join(process.cwd(), "public", "exports"), { recursive: true });
    
    // 写入文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    await fs.writeFile(filePath, excelBuffer);
    
    // 记录导出日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "价格管理",
        operation: "导出价格",
        method: "POST",
        requestUrl: request.url,
        requestParams: JSON.stringify(body),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
        remark: `导出${prices.length}条价格数据`
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "价格数据导出成功",
      data: {
        fileName,
        recordCount: prices.length,
        downloadUrl: `/exports/${fileName}`
      }
    });
  } catch (error) {
    console.error("价格导出错误:", error);
    
    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "价格管理",
          operation: "导出价格",
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
      { success: false, message: "价格导出失败" },
      { status: 500 }
    );
  }
}
