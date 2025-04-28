import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 初始化角色
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: '超级管理员' },
      update: {},
      create: {
        name: '超级管理员',
        description: '系统超级管理员，拥有所有权限',
        status: 1
      }
    }),
    prisma.role.upsert({
      where: { name: '管理员' },
      update: {},
      create: {
        name: '管理员',
        description: '系统管理员，拥有大部分管理权限',
        status: 1
      }
    }),
    prisma.role.upsert({
      where: { name: '内部用户' },
      update: {},
      create: {
        name: '内部用户',
        description: '公司内部用户，可以查看详细价格信息',
        status: 1
      }
    }),
    prisma.role.upsert({
      where: { name: '外部用户' },
      update: {},
      create: {
        name: '外部用户',
        description: '外部客户，只能查看基本价格信息',
        status: 1
      }
    })
  ]);

  console.log('角色初始化完成');

  // 初始化权限
  const permissions = [
    // 用户管理权限
    { name: '用户查看', code: 'user:view', description: '查看用户信息' },
    { name: '用户创建', code: 'user:create', description: '创建新用户' },
    { name: '用户编辑', code: 'user:edit', description: '编辑用户信息' },
    { name: '用户删除', code: 'user:delete', description: '删除用户' },
    // 角色权限管理
    { name: '角色查看', code: 'role:view', description: '查看角色信息' },
    { name: '角色创建', code: 'role:create', description: '创建新角色' },
    { name: '角色编辑', code: 'role:edit', description: '编辑角色信息' },
    { name: '角色删除', code: 'role:delete', description: '删除角色' },
    { name: '权限分配', code: 'permission:assign', description: '为角色分配权限' },
    // 组织管理权限
    { name: '组织查看', code: 'org:view', description: '查看组织信息' },
    { name: '组织创建', code: 'org:create', description: '创建新组织' },
    { name: '组织编辑', code: 'org:edit', description: '编辑组织信息' },
    { name: '组织删除', code: 'org:delete', description: '删除组织' },
    // 服务管理权限
    { name: '服务类型查看', code: 'service-type:view', description: '查看服务类型' },
    { name: '服务类型创建', code: 'service-type:create', description: '创建服务类型' },
    { name: '服务类型编辑', code: 'service-type:edit', description: '编辑服务类型' },
    { name: '服务类型删除', code: 'service-type:delete', description: '删除服务类型' },
    { name: '服务查看', code: 'service:view', description: '查看服务' },
    { name: '服务创建', code: 'service:create', description: '创建服务' },
    { name: '服务编辑', code: 'service:edit', description: '编辑服务' },
    { name: '服务删除', code: 'service:delete', description: '删除服务' },
    // 价格管理权限
    { name: '价格查看', code: 'price:view', description: '查看价格信息' },
    { name: '价格创建', code: 'price:create', description: '创建新价格' },
    { name: '价格编辑', code: 'price:edit', description: '编辑价格信息' },
    { name: '价格删除', code: 'price:delete', description: '删除价格' },
    { name: '价格导入', code: 'price:import', description: '导入价格数据' },
    { name: '价格导出', code: 'price:export', description: '导出价格数据' },
    // 系统管理权限
    { name: '系统配置查看', code: 'config:view', description: '查看系统配置' },
    { name: '系统配置编辑', code: 'config:edit', description: '编辑系统配置' },
    { name: '日志查看', code: 'log:view', description: '查看系统日志' },
    // 公告管理权限
    { name: '公告查看', code: 'announcement:view', description: '查看系统公告' },
    { name: '公告创建', code: 'announcement:create', description: '创建系统公告' },
    { name: '公告编辑', code: 'announcement:edit', description: '编辑系统公告' },
    { name: '公告删除', code: 'announcement:delete', description: '删除系统公告' },
    // 数据分析权限
    { name: '数据分析', code: 'data:analysis', description: '数据分析功能' }
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: {
        name: permission.name,
        code: permission.code,
        description: permission.description,
        status: 1
      }
    });
  }

  console.log('权限初始化完成');

  // 为角色分配权限
  // 获取所有权限
  const allPermissions = await prisma.permission.findMany();

  // 超级管理员拥有所有权限
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles[0].id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: roles[0].id,
        permissionId: permission.id
      }
    });
  }

  // 管理员拥有除了系统配置编辑外的所有权限
  for (const permission of allPermissions) {
    if (permission.code !== 'config:edit') {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[1].id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: roles[1].id,
          permissionId: permission.id
        }
      });
    }
  }

  // 内部用户拥有查看权限和价格导出权限
  const internalUserPermissions = ['user:view', 'org:view', 'price:view', 'price:export', 'data:analysis'];
  for (const permissionCode of internalUserPermissions) {
    const permission = allPermissions.find(p => p.code === permissionCode);
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[2].id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: roles[2].id,
          permissionId: permission.id
        }
      });
    }
  }

  // 外部用户只有价格查看权限
  const externalUserPermissions = ['price:view'];
  for (const permissionCode of externalUserPermissions) {
    const permission = allPermissions.find(p => p.code === permissionCode);
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[3].id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: roles[3].id,
          permissionId: permission.id
        }
      });
    }
  }

  console.log('角色权限分配完成');

  // 初始化根组织
  const organization = await prisma.organization.upsert({
    where: { name: '总公司' },
    update: {},
    create: {
      name: '总公司',
      level: 1,
      description: '公司总部',
      status: 1
    }
  });

  console.log('组织初始化完成');

  // 初始化管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      realName: '系统管理员',
      organizationId: organization.id,
      status: 1,
      userType: 1 // 内部用户
    }
  });

  // 为管理员分配超级管理员角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: roles[0].id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: roles[0].id
    }
  });

  console.log('管理员用户初始化完成');

  // 初始化物流服务类型
  const serviceTypes = await Promise.all([
    prisma.logisticsServiceType.upsert({
      where: { code: 'TRADITIONAL' },
      update: {},
      create: {
        name: '传统物流',
        code: 'TRADITIONAL',
        description: '传统物流服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'FBA' },
      update: {},
      create: {
        name: 'FBA头程物流',
        code: 'FBA',
        description: 'FBA头程物流服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'VALUE_ADDED' },
      update: {},
      create: {
        name: '增值服务',
        code: 'VALUE_ADDED',
        description: '增值服务',
        status: 1
      }
    })
  ]);

  // 传统物流子类型
  await Promise.all([
    prisma.logisticsServiceType.upsert({
      where: { code: 'SEA' },
      update: {},
      create: {
        name: '海运',
        code: 'SEA',
        parentId: serviceTypes[0].id,
        description: '海运服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'AIR' },
      update: {},
      create: {
        name: '空运',
        code: 'AIR',
        parentId: serviceTypes[0].id,
        description: '空运服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'LAND' },
      update: {},
      create: {
        name: '陆运',
        code: 'LAND',
        parentId: serviceTypes[0].id,
        description: '陆运服务',
        status: 1
      }
    })
  ]);

  // FBA头程物流子类型
  await Promise.all([
    prisma.logisticsServiceType.upsert({
      where: { code: 'FBA_SEA' },
      update: {},
      create: {
        name: '海运头程',
        code: 'FBA_SEA',
        parentId: serviceTypes[1].id,
        description: 'FBA海运头程',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'FBA_AIR' },
      update: {},
      create: {
        name: '空运头程',
        code: 'FBA_AIR',
        parentId: serviceTypes[1].id,
        description: 'FBA空运头程',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'FBA_EXPRESS' },
      update: {},
      create: {
        name: '快递头程',
        code: 'FBA_EXPRESS',
        parentId: serviceTypes[1].id,
        description: 'FBA快递头程',
        status: 1
      }
    })
  ]);

  // 增值服务子类型
  await Promise.all([
    prisma.logisticsServiceType.upsert({
      where: { code: 'OVERSEAS_WAREHOUSE' },
      update: {},
      create: {
        name: '海外仓服务',
        code: 'OVERSEAS_WAREHOUSE',
        parentId: serviceTypes[2].id,
        description: '海外仓储服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'LABELING' },
      update: {},
      create: {
        name: '贴换标服务',
        code: 'LABELING',
        parentId: serviceTypes[2].id,
        description: '贴换标签服务',
        status: 1
      }
    }),
    prisma.logisticsServiceType.upsert({
      where: { code: 'PACKAGING' },
      update: {},
      create: {
        name: '包装服务',
        code: 'PACKAGING',
        parentId: serviceTypes[2].id,
        description: '商品包装服务',
        status: 1
      }
    })
  ]);

  console.log('物流服务类型初始化完成');

  // 初始化区域数据 - 洲
  const continents = await Promise.all([
    prisma.region.upsert({
      where: { code: 'ASIA' },
      update: {},
      create: {
        name: '亚洲',
        code: 'ASIA',
        level: 1,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'EUROPE' },
      update: {},
      create: {
        name: '欧洲',
        code: 'EUROPE',
        level: 1,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'NORTH_AMERICA' },
      update: {},
      create: {
        name: '北美洲',
        code: 'NORTH_AMERICA',
        level: 1,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'SOUTH_AMERICA' },
      update: {},
      create: {
        name: '南美洲',
        code: 'SOUTH_AMERICA',
        level: 1,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'OCEANIA' },
      update: {},
      create: {
        name: '大洋洲',
        code: 'OCEANIA',
        level: 1,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'AFRICA' },
      update: {},
      create: {
        name: '非洲',
        code: 'AFRICA',
        level: 1,
        status: 1
      }
    })
  ]);

  // 初始化区域数据 - 国家 (部分示例)
  // 亚洲国家
  await Promise.all([
    prisma.region.upsert({
      where: { code: 'CN' },
      update: {},
      create: {
        name: '中国',
        code: 'CN',
        parentId: continents[0].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'JP' },
      update: {},
      create: {
        name: '日本',
        code: 'JP',
        parentId: continents[0].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'KR' },
      update: {},
      create: {
        name: '韩国',
        code: 'KR',
        parentId: continents[0].id,
        level: 2,
        status: 1
      }
    })
  ]);

  // 欧洲国家
  await Promise.all([
    prisma.region.upsert({
      where: { code: 'DE' },
      update: {},
      create: {
        name: '德国',
        code: 'DE',
        parentId: continents[1].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'GB' },
      update: {},
      create: {
        name: '英国',
        code: 'GB',
        parentId: continents[1].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'FR' },
      update: {},
      create: {
        name: '法国',
        code: 'FR',
        parentId: continents[1].id,
        level: 2,
        status: 1
      }
    })
  ]);

  // 北美洲国家
  await Promise.all([
    prisma.region.upsert({
      where: { code: 'US' },
      update: {},
      create: {
        name: '美国',
        code: 'US',
        parentId: continents[2].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'CA' },
      update: {},
      create: {
        name: '加拿大',
        code: 'CA',
        parentId: continents[2].id,
        level: 2,
        status: 1
      }
    }),
    prisma.region.upsert({
      where: { code: 'MX' },
      update: {},
      create: {
        name: '墨西哥',
        code: 'MX',
        parentId: continents[2].id,
        level: 2,
        status: 1
      }
    })
  ]);

  console.log('区域数据初始化完成');

  // 初始化系统配置
  const configs = [
    { key: 'SYSTEM_NAME', value: '物流查价系统', description: '系统名称' },
    { key: 'COMPANY_NAME', value: 'PGS物流', description: '公司名称' },
    { key: 'CONTACT_EMAIL', value: 'support@example.com', description: '联系邮箱' },
    { key: 'CONTACT_PHONE', value: '400-123-4567', description: '联系电话' },
    { key: 'DEFAULT_CURRENCY', value: 'CNY', description: '默认货币' },
    { key: 'PRICE_DECIMAL_PLACES', value: '2', description: '价格小数位数' },
    { key: 'WEIGHT_UNIT', value: 'kg', description: '重量单位' },
    { key: 'VOLUME_UNIT', value: 'm³', description: '体积单位' }
  ];

  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { configKey: config.key },
      update: {},
      create: {
        configKey: config.key,
        configValue: config.value,
        description: config.description,
        status: 1
      }
    });
  }

  console.log('系统配置初始化完成');

  console.log('数据初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
