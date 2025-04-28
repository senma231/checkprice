-- 添加细化的价格权限
INSERT INTO "permissions" ("name", "code", "description", "status", "createdAt", "updatedAt")
VALUES 
('查看内部价格', 'price:view:internal', '查看内部价格信息', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('查看外部价格', 'price:view:external', '查看外部价格信息', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('设置价格可见性', 'price:visibility', '设置价格的可见性范围', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('批量导入价格', 'price:import:batch', '批量导入价格数据', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('批量导出价格', 'price:export:batch', '批量导出价格数据', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('管理组织价格', 'price:manage:org', '管理特定组织的价格', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 为超级管理员角色添加新权限
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT 
  (SELECT id FROM "roles" WHERE name = '超级管理员' LIMIT 1),
  id,
  CURRENT_TIMESTAMP
FROM "permissions" 
WHERE code IN (
  'price:view:internal',
  'price:view:external',
  'price:visibility',
  'price:import:batch',
  'price:export:batch',
  'price:manage:org'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 为管理员角色添加新权限
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT 
  (SELECT id FROM "roles" WHERE name = '管理员' LIMIT 1),
  id,
  CURRENT_TIMESTAMP
FROM "permissions" 
WHERE code IN (
  'price:view:internal',
  'price:view:external',
  'price:visibility',
  'price:import:batch',
  'price:export:batch',
  'price:manage:org'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 为内部用户角色添加查看内部价格权限
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT 
  (SELECT id FROM "roles" WHERE name = '内部用户' LIMIT 1),
  id,
  CURRENT_TIMESTAMP
FROM "permissions" 
WHERE code IN (
  'price:view:internal',
  'price:view:external',
  'price:export:batch'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 为外部用户角色添加查看外部价格权限
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT 
  (SELECT id FROM "roles" WHERE name = '外部用户' LIMIT 1),
  id,
  CURRENT_TIMESTAMP
FROM "permissions" 
WHERE code IN (
  'price:view:external'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
