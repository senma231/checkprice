import { PrismaClient } from '@prisma/client';
import cache from './cache';

/**
 * 查询优化器
 * 用于优化数据库查询，提高系统性能
 */
class QueryOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 优化价格查询
   * 使用缓存和查询优化技术提高查询性能
   * @param params 查询参数
   * @param session 用户会话信息
   * @returns 查询结果
   */
  async optimizePriceQuery(params: any, session?: any) {
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
    } = params;

    // 构建缓存键，包含用户信息以区分不同用户的缓存
    const userInfo = session ?
      {
        userType: session.user.userType,
        organizationId: session.user.organizationId,
        permissions: session.user.permissions.filter(p => p.startsWith("price:"))
      } :
      { userType: 3, organizationId: null, permissions: [] }; // 3表示匿名用户

    const cacheKey = `price_query:${JSON.stringify({
      ...userInfo,
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
    })}`;

    // 尝试从缓存获取结果
    return await cache.getOrSet(cacheKey, async () => {
      // 构建查询条件
      const where: any = {
        isCurrent: true,
        effectiveDate: {
          lte: new Date(queryDate)
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date(queryDate) } }
        ]
      };

      // 添加高级筛选条件

      // 价格范围筛选
      if (priceMin !== undefined || priceMax !== undefined) {
        where.price = {};

        if (priceMin !== undefined) {
          where.price.gte = parseFloat(priceMin);
        }

        if (priceMax !== undefined) {
          where.price.lte = parseFloat(priceMax);
        }
      }

      // 有效期范围筛选
      if (validityStart || validityEnd) {
        // 如果已经有effectiveDate条件，需要合并
        if (validityStart) {
          where.effectiveDate = {
            ...where.effectiveDate,
            gte: new Date(validityStart)
          };
        }

        if (validityEnd) {
          // 修改OR条件中的expiryDate
          where.OR = where.OR.map((condition: any) => {
            if (condition.expiryDate) {
              return {
                ...condition,
                expiryDate: {
                  ...condition.expiryDate,
                  lte: new Date(validityEnd)
                }
              };
            }
            return condition;
          });
        }
      }

      // 可见性类型筛选
      if (visibilityType) {
        where.visibilityType = parseInt(visibilityType);
      }

      // 即将到期筛选
      if (isExpiringSoon) {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        // 添加到OR条件中
        where.OR = where.OR.filter((condition: any) => condition.expiryDate);
        where.OR.forEach((condition: any) => {
          condition.expiryDate = {
            ...condition.expiryDate,
            lte: thirtyDaysLater
          };
        });
      }

      // 所属组织筛选
      if (organizationId) {
        where.organizationId = parseInt(organizationId);
      }

      // 创建人筛选
      if (createdBy) {
        where.createdBy = parseInt(createdBy);
      }

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

      // 优化重量和体积查询
      if (weight) {
        const weightValue = parseFloat(weight);
        where.OR = [
          ...(where.OR || []),
          {
            AND: [
              { weightStart: { lte: weightValue } },
              {
                OR: [
                  { weightEnd: { gte: weightValue } },
                  { weightEnd: null }
                ]
              }
            ]
          },
          {
            AND: [
              { weightStart: null },
              {
                OR: [
                  { weightEnd: { gte: weightValue } },
                  { weightEnd: null }
                ]
              }
            ]
          }
        ];
      }

      if (volume) {
        const volumeValue = parseFloat(volume);
        const volumeCondition = {
          OR: [
            {
              AND: [
                { volumeStart: { lte: volumeValue } },
                {
                  OR: [
                    { volumeEnd: { gte: volumeValue } },
                    { volumeEnd: null }
                  ]
                }
              ]
            },
            {
              AND: [
                { volumeStart: null },
                {
                  OR: [
                    { volumeEnd: { gte: volumeValue } },
                    { volumeEnd: null }
                  ]
                }
              ]
            }
          ]
        };

        // 如果已经有OR条件，则添加AND条件
        if (where.OR && where.OR.length > 0) {
          where.AND = [
            ...(where.AND || []),
            volumeCondition
          ];
        } else {
          where.OR = volumeCondition.OR;
        }
      }

      // 根据用户权限和类型过滤价格
      if (session) {
        const userType = session.user.userType;
        const organizationId = session.user.organizationId;
        const permissions = session.user.permissions || [];

        // 检查价格查看权限
        const canViewExternal = permissions.includes("price:view:external") ||
                               permissions.includes("price:view");
        const canViewInternal = permissions.includes("price:view:internal") ||
                               permissions.includes("price:view");

        // 根据权限过滤价格类型
        if (canViewInternal && canViewExternal) {
          // 可以查看所有价格类型，不需要额外过滤
        } else if (canViewInternal) {
          where.priceType = 2; // 只能查看内部价格
        } else if (canViewExternal) {
          where.priceType = 1; // 只能查看外部价格
        } else {
          // 没有任何价格查看权限，返回空结果
          return {
            prices: [],
            pagination: {
              current: page,
              pageSize,
              total: 0
            }
          };
        }

        // 添加可见性过滤
        // 1. 如果用户有管理组织价格的权限，可以查看所有价格
        // 2. 否则，只能查看对自己可见的价格
        if (!permissions.includes("price:manage:org") &&
            !session.user.roles.includes("超级管理员") &&
            !session.user.roles.includes("管理员")) {

          const visibilityCondition = {
            OR: [
              { visibilityType: 1 }, // 所有组织可见
              {
                visibilityType: 2,
                visibleOrgs: { contains: organizationId?.toString() }
              }, // 指定组织可见且包含当前用户组织
              {
                visibilityType: 3,
                organizationId: organizationId
              } // 仅创建组织可见且是当前用户组织
            ]
          };

          // 如果已经有AND条件，则添加到AND中
          if (where.AND && where.AND.length > 0) {
            where.AND.push(visibilityCondition);
          } else {
            where.AND = [visibilityCondition];
          }
        }
      } else {
        // 匿名用户只能看到对外价格且所有组织可见的价格
        where.priceType = 1; // 对外价格
        where.visibilityType = 1; // 所有组织可见
      }

      // 构建排序条件
      const orderBy: any = {};

      // 默认按价格升序排序
      if (sortField === "price") {
        orderBy.price = sortOrder === "desc" ? "desc" : "asc";
      }
      // 按生效日期排序
      else if (sortField === "effectiveDate") {
        orderBy.effectiveDate = sortOrder === "desc" ? "desc" : "asc";
      }
      // 按更新时间排序
      else if (sortField === "updatedAt") {
        orderBy.updatedAt = sortOrder === "desc" ? "desc" : "asc";
      }
      // 默认排序
      else {
        orderBy.price = "asc";
      }

      // 执行查询
      const [prices, total] = await Promise.all([
        this.prisma.price.findMany({
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
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy
        }),
        this.prisma.price.count({ where })
      ]);

      // 处理价格数据，添加额外信息
      const enhancedPrices = prices.map(price => {
        // 计算价格有效期
        const validDays = price.expiryDate
          ? Math.ceil((price.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // 添加额外信息
        return {
          ...price,
          validDays,
          isExpiringSoon: validDays !== null && validDays <= 30, // 30天内过期
          weightRange: `${price.weightStart || 0} - ${price.weightEnd || '不限'}`,
          volumeRange: `${price.volumeStart || 0} - ${price.volumeEnd || '不限'}`,
          priceDisplay: `${price.price} ${price.currency}/${price.priceUnit}`,
          priceTypeDisplay: price.priceType === 1 ? "对外价格" : "内部价格",
          visibilityDisplay: price.visibilityType === 1 ? "所有组织可见" :
                            price.visibilityType === 2 ? "指定组织可见" : "仅创建组织可见"
        };
      });

      return {
        prices: enhancedPrices,
        pagination: {
          current: page,
          pageSize,
          total
        }
      };
    }, 300); // 缓存5分钟
  }

  /**
   * 优化区域数据查询
   * @param params 查询参数
   * @returns 查询结果
   */
  async optimizeRegionsQuery(params: any = {}) {
    const { parentId, level } = params;

    // 构建缓存键
    const cacheKey = `regions:${JSON.stringify({ parentId, level })}`;

    // 尝试从缓存获取结果
    return await cache.getOrSet(cacheKey, async () => {
      // 构建查询条件
      const where: any = {
        status: 1
      };

      if (parentId) {
        where.parentId = parseInt(parentId);
      } else if (parentId === "null") {
        where.parentId = null;
      }

      if (level) {
        where.level = parseInt(level);
      }

      // 执行查询
      return await this.prisma.region.findMany({
        where,
        include: {
          parent: true,
          _count: {
            select: {
              children: true
            }
          }
        },
        orderBy: {
          id: "asc"
        }
      });
    }, 3600); // 缓存1小时
  }

  /**
   * 优化服务类型查询
   * @param params 查询参数
   * @returns 查询结果
   */
  async optimizeServiceTypesQuery(params: any = {}) {
    const { parentId } = params;

    // 构建缓存键
    const cacheKey = `service_types:${JSON.stringify({ parentId })}`;

    // 尝试从缓存获取结果
    return await cache.getOrSet(cacheKey, async () => {
      // 构建查询条件
      const where: any = {
        status: 1
      };

      if (parentId) {
        where.parentId = parseInt(parentId);
      } else if (parentId === "null") {
        where.parentId = null;
      }

      // 执行查询
      return await this.prisma.logisticsServiceType.findMany({
        where,
        include: {
          parent: true,
          _count: {
            select: {
              children: true
            }
          }
        },
        orderBy: {
          id: "asc"
        }
      });
    }, 3600); // 缓存1小时
  }

  /**
   * 优化用户查询
   * @param params 查询参数
   * @returns 查询结果
   */
  async optimizeUsersQuery(params: any) {
    const {
      username,
      userType,
      status,
      organizationId,
      page = 1,
      pageSize = 10
    } = params;

    // 构建查询条件
    const where: any = {};

    if (username) {
      where.username = {
        contains: username
      };
    }

    if (userType) {
      where.userType = parseInt(userType);
    }

    if (status !== undefined) {
      where.status = parseInt(status);
    }

    if (organizationId) {
      where.organizationId = parseInt(organizationId);
    }

    // 执行查询
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          organization: true,
          userRoles: {
            include: {
              role: true
            }
          }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "asc"
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        current: page,
        pageSize,
        total
      }
    };
  }

  /**
   * 优化日志查询
   * @param params 查询参数
   * @returns 查询结果
   */
  async optimizeLogsQuery(params: any) {
    const {
      module,
      operation,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = params;

    // 构建查询条件
    const where: any = {};

    if (module) {
      where.module = module;
    }

    if (operation) {
      where.operation = {
        contains: operation
      };
    }

    if (status !== undefined) {
      where.status = parseInt(status);
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // 执行查询
    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
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
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: "desc"
        }
      }),
      this.prisma.operationLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        current: page,
        pageSize,
        total
      }
    };
  }
}

export default QueryOptimizer;
