#!/bin/bash

# 物流查价系统打包脚本
# 此脚本用于在本地打包项目，生成可部署到服务器的压缩包

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 切换到项目根目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "${GREEN}开始打包物流查价系统...${NC}"
echo "项目根目录: $PROJECT_ROOT"

# 创建临时目录
TEMP_DIR="$PROJECT_ROOT/dist"
echo -e "${YELLOW}创建临时目录: $TEMP_DIR${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 复制必要的文件
echo -e "${YELLOW}复制项目文件...${NC}"
cp -r package.json package-lock.json .env.example next.config.mjs tsconfig.json prisma public README.md "$TEMP_DIR/"
cp -r src "$TEMP_DIR/"
cp -r scripts "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/docs"
cp -r docs/deployment-guide.md "$TEMP_DIR/docs/"

# 创建.env.example文件（如果不存在）
if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
  echo -e "${YELLOW}创建.env.example文件...${NC}"
  cat > "$TEMP_DIR/.env.example" << EOL
# 数据库连接
DATABASE_URL="postgresql://logistics_user:your_secure_password@localhost:5432/logistics_db"

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# 其他配置
NODE_ENV="production"
