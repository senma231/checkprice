import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from 'xlsx';
import { PriceValidator } from "@/lib/price-validator";

// 处理文件上传和价格导入
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

    // 检查是否有导入价格的权限
    const hasPermission = session.user.permissions.includes("price:import") ||
                         session.user.permissions.includes("price:import:batch");
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: "没有导入价格的权限" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "未找到上传文件" },
        { status: 400 }
      );
    }

    // 检查文件类型和扩展名
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, message: "仅支持Excel文件格式(.xlsx或.xls)" },
        { status: 400 }
      );
    }

    const fileType = "EXCEL";

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    // 生成唯一文件名
    const fileName = `${uuidv4()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 创建导入记录
    const importRecord = await prisma.priceImportRecord.create({
      data: {
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath,
        importStatus: 0, // 处理中
        importedBy: session.user.id,
      }
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        module: "价格管理",
        operation: "导入价格",
        method: "POST",
        requestUrl: request.url,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        status: 1,
      }
    });

    try {
      // 解析Excel文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        await prisma.priceImportRecord.update({
          where: { id: importRecord.id },
          data: {
            importStatus: 2, // 失败
            errorMessage: "Excel文件中没有数据",
            totalRecords: 0,
            successRecords: 0,
            failedRecords: 0
          }
        });

        return NextResponse.json({
          success: false,
          message: "Excel文件中没有数据",
          data: {
            importId: importRecord.id,
            fileName: file.name,
            fileType,
            fileSize: file.size,
            importStatus: 2
          }
        });
      }

      // 处理导入数据
      const importResults = await processImportData(jsonData, importRecord.id, session.user.id);

      // 更新导入记录
      await prisma.priceImportRecord.update({
        where: { id: importRecord.id },
        data: {
          importStatus: importResults.failedRecords > 0 ? 2 : 1, // 1:成功, 2:部分失败
          totalRecords: importResults.totalRecords,
          successRecords: importResults.successRecords,
          failedRecords: importResults.failedRecords,
          errorMessage: importResults.failedRecords > 0 ? "部分数据导入失败，请查看错误记录" : null
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          importId: importRecord.id,
          fileName: file.name,
          fileType,
          fileSize: file.size,
          importStatus: importResults.failedRecords > 0 ? 2 : 1,
          totalRecords: importResults.totalRecords,
          successRecords: importResults.successRecords,
          failedRecords: importResults.failedRecords
        }
      });
    } catch (error) {
      console.error("解析Excel文件错误:", error);

      // 更新导入记录状态
      await prisma.priceImportRecord.update({
        where: { id: importRecord.id },
        data: {
          importStatus: 2, // 失败
          errorMessage: `解析Excel文件错误: ${(error as Error).message}`
        }
      });

      return NextResponse.json({
        success: false,
        message: "解析Excel文件失败",
        data: {
          importId: importRecord.id,
          fileName: file.name,
          fileType,
          fileSize: file.size,
          importStatus: 2
        }
      });
    }
  } catch (error) {
    console.error("价格导入错误:", error);

    // 记录错误日志
    const session = await getServerSession(authOptions);
    if (session) {
      await prisma.operationLog.create({
        data: {
          userId: session.user.id,
          module: "价格管理",
          operation: "导入价格",
          method: "POST",
          requestUrl: request.url,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          status: 0,
          errorMessage: (error as Error).message,
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "价格导入失败" },
      { status: 500 }
    );
  }
}

/**
 * 处理导入数据
 * @param jsonData Excel导入的JSON数据
 * @param importId 导入记录ID
 * @param userId 用户ID
 * @returns 导入结果统计
 */
async function processImportData(jsonData: any[], importId: number, userId: number) {
  let totalRecords = jsonData.length;
  let successRecords = 0;
  let failedRecords = 0;

  // 批量处理数据
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2; // Excel行号从2开始（1是标题行）

    try {
      // 解析和验证数据
      const priceData = await parseRowData(row);

      // 验证价格数据
      const validation = PriceValidator.validatePriceData(priceData);
      if (!validation.isValid) {
        // 记录错误
        await prisma.priceImportError.create({
          data: {
            importId,
            rowNumber,
            errorMessage: `数据验证失败: ${validation.errors.join(', ')}`,
            rawData: JSON.stringify(row)
          }
        });

        failedRecords++;
        continue;
      }

      // 检查价格冲突
      const conflict = await PriceValidator.checkPriceConflict(priceData);
      if (conflict) {
        // 记录错误
        await prisma.priceImportError.create({
          data: {
            importId,
            rowNumber,
            errorMessage: `存在重叠的价格区间: ${conflict.conflicts.map(p => p.id).join(', ')}`,
            rawData: JSON.stringify(row)
          }
        });

        failedRecords++;
        continue;
      }

      // 创建价格记录
      const price = await prisma.price.create({
        data: {
          ...priceData,
          createdBy: userId
        }
      });

      // 创建价格历史记录
      await prisma.priceHistory.create({
        data: {
          priceId: price.id,
          serviceId: priceData.serviceId,
          serviceType: priceData.serviceType,
          originRegionId: priceData.originRegionId,
          destinationRegionId: priceData.destinationRegionId,
          weightStart: priceData.weightStart,
          weightEnd: priceData.weightEnd,
          volumeStart: priceData.volumeStart,
          volumeEnd: priceData.volumeEnd,
          price: priceData.price,
          currency: priceData.currency,
          priceUnit: priceData.priceUnit,
          effectiveDate: priceData.effectiveDate,
          expiryDate: priceData.expiryDate,
          remark: priceData.remark,
          organizationId: priceData.organizationId,
          priceType: priceData.priceType,
          visibilityType: priceData.visibilityType,
          visibleOrgs: priceData.visibleOrgs,
          operationType: "导入",
          operatedBy: userId,
        }
      });

      successRecords++;
    } catch (error) {
      console.error(`处理第${rowNumber}行数据错误:`, error);

      // 记录错误
      await prisma.priceImportError.create({
        data: {
          importId,
          rowNumber,
          errorMessage: `处理数据错误: ${(error as Error).message}`,
          rawData: JSON.stringify(row)
        }
      });

      failedRecords++;
    }
  }

  return {
    totalRecords,
    successRecords,
    failedRecords
  };
}

/**
 * 解析Excel行数据为价格数据
 * @param row Excel行数据
 * @returns 解析后的价格数据
 */
async function parseRowData(row: any) {
  // 服务类型映射
  const serviceTypeMap: Record<string, number> = {
    "传统物流": 1,
    "FBA头程物流": 2,
    "增值服务": 3
  };

  // 价格类型映射
  const priceTypeMap: Record<string, number> = {
    "对外价格": 1,
    "内部价格": 2
  };

  // 可见性类型映射
  const visibilityTypeMap: Record<string, number> = {
    "所有组织可见": 1,
    "指定组织可见": 2,
    "仅创建组织可见": 3
  };

  // 解析服务类型
  const serviceType = serviceTypeMap[row["服务类型"]] || 1;

  // 解析服务ID
  const serviceId = parseInt(row["服务ID"]) || 0;
  if (serviceId <= 0) {
    throw new Error("服务ID无效");
  }

  // 解析区域ID
  let originRegionId = null;
  let destinationRegionId = null;

  if (row["始发地"] && row["始发地"] !== "全部" && row["始发地"] !== "不限") {
    // 查找区域ID
    const originRegion = await prisma.region.findFirst({
      where: { name: row["始发地"] }
    });

    if (originRegion) {
      originRegionId = originRegion.id;
    } else {
      throw new Error(`找不到始发地: ${row["始发地"]}`);
    }
  }

  if (row["目的地"] && row["目的地"] !== "全部" && row["目的地"] !== "不限") {
    // 查找区域ID
    const destinationRegion = await prisma.region.findFirst({
      where: { name: row["目的地"] }
    });

    if (destinationRegion) {
      destinationRegionId = destinationRegion.id;
    } else {
      throw new Error(`找不到目的地: ${row["目的地"]}`);
    }
  }

  // 解析重量范围
  let weightStart = null;
  let weightEnd = null;

  if (row["重量范围(kg)"]) {
    const weightRange = row["重量范围(kg)"].toString();

    if (weightRange.includes("-")) {
      const [start, end] = weightRange.split("-").map(s => parseFloat(s.trim()));
      weightStart = isNaN(start) ? null : start;
      weightEnd = isNaN(end) ? null : end;
    } else if (weightRange.includes("以上")) {
      const start = parseFloat(weightRange.replace("以上", "").trim());
      weightStart = isNaN(start) ? null : start;
    } else if (weightRange.includes("以下") || weightRange.includes("不超过")) {
      const end = parseFloat(weightRange.replace(/以下|不超过/g, "").trim());
      weightEnd = isNaN(end) ? null : end;
    } else if (weightRange !== "不限" && weightRange !== "全部") {
      const value = parseFloat(weightRange.trim());
      if (!isNaN(value)) {
        weightStart = value;
        weightEnd = value;
      }
    }
  }

  // 解析体积范围
  let volumeStart = null;
  let volumeEnd = null;

  if (row["体积范围(m³)"]) {
    const volumeRange = row["体积范围(m³)"].toString();

    if (volumeRange.includes("-")) {
      const [start, end] = volumeRange.split("-").map(s => parseFloat(s.trim()));
      volumeStart = isNaN(start) ? null : start;
      volumeEnd = isNaN(end) ? null : end;
    } else if (volumeRange.includes("以上")) {
      const start = parseFloat(volumeRange.replace("以上", "").trim());
      volumeStart = isNaN(start) ? null : start;
    } else if (volumeRange.includes("以下") || volumeRange.includes("不超过")) {
      const end = parseFloat(volumeRange.replace(/以下|不超过/g, "").trim());
      volumeEnd = isNaN(end) ? null : end;
    } else if (volumeRange !== "不限" && volumeRange !== "全部") {
      const value = parseFloat(volumeRange.trim());
      if (!isNaN(value)) {
        volumeStart = value;
        volumeEnd = value;
      }
    }
  }

  // 解析价格
  const price = parseFloat(row["价格"]);
  if (isNaN(price) || price < 0) {
    throw new Error("价格无效");
  }

  // 解析币种
  const currency = row["币种"] || "CNY";

  // 解析计价单位
  const priceUnit = row["计价单位"] || "kg";

  // 解析日期
  let effectiveDate = new Date();
  let expiryDate = null;

  if (row["生效日期"]) {
    const dateStr = row["生效日期"].toString();
    const parsedDate = new Date(dateStr);

    if (!isNaN(parsedDate.getTime())) {
      effectiveDate = parsedDate;
    } else {
      throw new Error(`生效日期格式无效: ${dateStr}`);
    }
  }

  if (row["失效日期"] && row["失效日期"] !== "长期有效") {
    const dateStr = row["失效日期"].toString();
    const parsedDate = new Date(dateStr);

    if (!isNaN(parsedDate.getTime())) {
      expiryDate = parsedDate;
    } else {
      throw new Error(`失效日期格式无效: ${dateStr}`);
    }
  }

  // 解析价格类型
  const priceType = row["价格类型"] ? (priceTypeMap[row["价格类型"]] || 1) : 1;

  // 解析可见性
  const visibilityType = row["可见性"] ? (visibilityTypeMap[row["可见性"]] || 1) : 1;

  // 解析组织ID
  let organizationId = null;

  if (row["所属组织"] && row["所属组织"] !== "无") {
    // 查找组织ID
    const organization = await prisma.organization.findFirst({
      where: { name: row["所属组织"] }
    });

    if (organization) {
      organizationId = organization.id;
    } else {
      throw new Error(`找不到组织: ${row["所属组织"]}`);
    }
  }

  // 解析可见组织
  let visibleOrgs = null;

  if (visibilityType === 2 && row["可见组织"]) {
    const orgNames = row["可见组织"].toString().split(",").map(s => s.trim());

    if (orgNames.length > 0) {
      // 查找组织ID
      const organizations = await prisma.organization.findMany({
        where: {
          name: {
            in: orgNames
          }
        }
      });

      if (organizations.length > 0) {
        visibleOrgs = organizations.map(org => org.id).join(",");
      }
    }
  }

  // 返回解析后的价格数据
  return {
    serviceId,
    serviceType,
    originRegionId,
    destinationRegionId,
    weightStart,
    weightEnd,
    volumeStart,
    volumeEnd,
    price,
    currency,
    priceUnit,
    effectiveDate,
    expiryDate,
    isCurrent: true,
    remark: row["备注"] || null,
    organizationId,
    priceType,
    visibilityType,
    visibleOrgs
  };
}

// 获取导入记录列表
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // 获取导入记录
    const [records, total] = await Promise.all([
      prisma.priceImportRecord.findMany({
        include: {
          importer: {
            select: {
              id: true,
              username: true,
              realName: true,
            }
          },
          _count: {
            select: {
              importErrors: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.priceImportRecord.count()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error) {
    console.error("获取导入记录错误:", error);
    return NextResponse.json(
      { success: false, message: "获取导入记录失败" },
      { status: 500 }
    );
  }
}
