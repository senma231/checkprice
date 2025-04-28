// 数据库初始化脚本
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  try {
    // 清空现有数据
    console.log('清空现有数据...');

    // 获取数据库中存在的表
    const tablesResult = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `;

    const tables = tablesResult.map(t => t.tablename);
    console.log('现有表:', tables);

    // 只清空存在的表
    for (const table of [
      'user_roles', 'role_permissions', 'users', 'roles', 'permissions',
      'organizations', 'announcements', 'configurations',
      'logistics_service_types', 'logistics_services', 'logistics_prices',
      'regions', 'operation_logs', 'query_logs'
    ]) {
      if (tables.includes(table)) {
        console.log(`清空表 ${table}...`);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    }

    // 创建权限
    console.log('创建权限...');
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
      await prisma.permission.create({
        data: {
          name: permission.name,
          code: permission.code,
          description: permission.description,
          status: 1
        }
      });
    }

    // 创建超级管理员角色
    console.log('创建超级管理员角色...');
    const adminRole = await prisma.role.create({
      data: {
        name: '超级管理员',
        description: '系统超级管理员，拥有所有权限',
        status: 1
      }
    });

    // 为超级管理员角色分配所有权限
    console.log('为超级管理员角色分配所有权限...');
    const allPermissions = await prisma.permission.findMany();

    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });
    }

    // 创建总公司组织
    console.log('创建总公司组织...');
    const headOffice = await prisma.organization.create({
      data: {
        name: '总公司',
        level: 1,
        description: '公司总部',
        status: 1
      }
    });

    // 创建超级管理员用户
    console.log('创建超级管理员用户...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '13800138000',
        realName: '系统管理员',
        organizationId: headOffice.id,
        status: 1,
        userType: 1
      }
    });

    // 为超级管理员用户分配超级管理员角色
    console.log('为超级管理员用户分配超级管理员角色...');
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    });

    // 创建基本系统配置
    console.log('创建基本系统配置...');
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
      await prisma.configuration.create({
        data: {
          configKey: config.key,
          configValue: config.value,
          description: config.description,
          status: 1
        }
      });
    }

    console.log('数据库初始化完成！');
    console.log('默认管理员账号: admin');
    console.log('默认管理员密码: admin123');

  } catch (error) {
    console.error('初始化数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
