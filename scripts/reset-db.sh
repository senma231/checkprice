#!/bin/bash

# 重置数据库并初始化默认数据的脚本

echo "开始重置数据库..."

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 确保数据库存在
echo "确保数据库存在..."
npx prisma db push --accept-data-loss

# 运行初始化脚本
echo "运行初始化脚本..."
node scripts/init-db.js

echo "数据库重置完成！"
echo "默认管理员账号: admin"
echo "默认管理员密码: admin123"
