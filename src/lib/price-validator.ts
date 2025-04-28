import { prisma } from "./prisma";

/**
 * 价格验证器
 * 用于验证价格数据的有效性和一致性
 */
export class PriceValidator {
  /**
   * 检查价格是否与现有价格冲突
   * @param priceData 价格数据
   * @param excludePriceId 排除的价格ID（用于编辑时排除自身）
   * @returns 冲突信息，如果没有冲突则返回null
   */
  static async checkPriceConflict(priceData: any, excludePriceId?: number) {
    const {
      serviceId,
      serviceType,
      originRegionId,
      destinationRegionId,
      weightStart,
      weightEnd,
      volumeStart,
      volumeEnd,
      effectiveDate,
      expiryDate,
      isCurrent
    } = priceData;

    // 只检查当前有效的价格
    if (!isCurrent) {
      return null;
    }

    // 构建查询条件
    const where: any = {
      serviceId: parseInt(serviceId),
      serviceType: parseInt(serviceType),
      isCurrent: true
    };

    // 如果是编辑价格，排除自身
    if (excludePriceId) {
      where.id = { not: excludePriceId };
    }

    // 添加区域条件
    if (originRegionId) {
      where.originRegionId = parseInt(originRegionId);
    } else {
      where.originRegionId = null;
    }

    if (destinationRegionId) {
      where.destinationRegionId = parseInt(destinationRegionId);
    } else {
      where.destinationRegionId = null;
    }

    // 添加日期条件
    const effectiveDateTime = new Date(effectiveDate);
    where.OR = [
      // 现有价格的生效日期在新价格的有效期内
      {
        effectiveDate: {
          gte: effectiveDateTime,
          ...(expiryDate ? { lte: new Date(expiryDate) } : {})
        }
      },
      // 现有价格的失效日期在新价格的有效期内
      {
        expiryDate: {
          gte: effectiveDateTime,
          ...(expiryDate ? { lte: new Date(expiryDate) } : {})
        }
      },
      // 新价格的有效期完全包含在现有价格的有效期内
      {
        effectiveDate: { lte: effectiveDateTime },
        ...(expiryDate
          ? { expiryDate: { gte: new Date(expiryDate) } }
          : { expiryDate: null })
      }
    ];

    // 查询可能冲突的价格
    const potentialConflicts = await prisma.price.findMany({
      where,
      include: {
        originRegion: true,
        destinationRegion: true
      }
    });

    // 检查重量和体积范围是否重叠
    const conflicts = potentialConflicts.filter(price => {
      // 检查重量范围是否重叠
      const weightOverlap =
        (weightStart === null && weightEnd === null) ||
        (price.weightStart === null && price.weightEnd === null) ||
        (weightStart !== null &&
          price.weightEnd !== null &&
          parseFloat(weightStart) <= parseFloat(String(price.weightEnd))) ||
        (weightEnd !== null &&
          price.weightStart !== null &&
          parseFloat(weightEnd) >= parseFloat(String(price.weightStart)));

      // 检查体积范围是否重叠
      const volumeOverlap =
        (volumeStart === null && volumeEnd === null) ||
        (price.volumeStart === null && price.volumeEnd === null) ||
        (volumeStart !== null &&
          price.volumeEnd !== null &&
          parseFloat(volumeStart) <= parseFloat(String(price.volumeEnd))) ||
        (volumeEnd !== null &&
          price.volumeStart !== null &&
          parseFloat(volumeEnd) >= parseFloat(String(price.volumeStart)));

      return weightOverlap && volumeOverlap;
    });

    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        conflicts,
        message: "存在重叠的价格区间"
      };
    }

    return null;
  }

  /**
   * 验证价格数据的有效性
   * @param priceData 价格数据
   * @returns 验证结果，包含是否有效和错误信息
   */
  static validatePriceData(priceData: any) {
    const errors = [];

    // 检查必填字段
    const requiredFields = [
      "serviceId",
      "serviceType",
      "price",
      "currency",
      "priceUnit",
      "effectiveDate"
    ];

    for (const field of requiredFields) {
      if (priceData[field] === undefined || priceData[field] === null || priceData[field] === "") {
        errors.push(`${field} 是必填字段`);
      }
    }

    // 检查数值字段
    const numberFields = [
      "weightStart",
      "weightEnd",
      "volumeStart",
      "volumeEnd",
      "price"
    ];

    for (const field of numberFields) {
      if (
        priceData[field] !== undefined &&
        priceData[field] !== null &&
        priceData[field] !== "" &&
        isNaN(parseFloat(priceData[field]))
      ) {
        errors.push(`${field} 必须是有效的数字`);
      }
    }

    // 检查范围字段
    if (
      priceData.weightStart !== undefined &&
      priceData.weightEnd !== undefined &&
      priceData.weightStart !== null &&
      priceData.weightEnd !== null &&
      priceData.weightStart !== "" &&
      priceData.weightEnd !== "" &&
      parseFloat(priceData.weightStart) > parseFloat(priceData.weightEnd)
    ) {
      errors.push("重量起始值不能大于结束值");
    }

    if (
      priceData.volumeStart !== undefined &&
      priceData.volumeEnd !== undefined &&
      priceData.volumeStart !== null &&
      priceData.volumeEnd !== null &&
      priceData.volumeStart !== "" &&
      priceData.volumeEnd !== "" &&
      parseFloat(priceData.volumeStart) > parseFloat(priceData.volumeEnd)
    ) {
      errors.push("体积起始值不能大于结束值");
    }

    // 检查日期字段
    if (
      priceData.effectiveDate &&
      priceData.expiryDate &&
      new Date(priceData.effectiveDate) > new Date(priceData.expiryDate)
    ) {
      errors.push("生效日期不能晚于失效日期");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
