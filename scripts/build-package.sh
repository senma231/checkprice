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
cp -r package.json package-lock.json .env.example tsconfig.json prisma public README.md "$TEMP_DIR/"
cp -r src "$TEMP_DIR/"
cp -r scripts "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/docs"
cp -r docs/deployment-guide.md "$TEMP_DIR/docs/"

# 创建.env.example文件（如果不存在）
if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
  echo -e "${YELLOW}创建.env.example文件...${NC}"
  cat > "$TEMP_DIR/.env.example" << ENVFILE
# 数据库连接
DATABASE_URL="postgresql://logistics_user:your_secure_password@localhost:5432/logistics_db"

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# 其他配置
NODE_ENV="production"
ENVFILE
fi

# 创建部署后的启动脚本
echo -e "${YELLOW}创建部署脚本...${NC}"
cat > "$TEMP_DIR/scripts/deploy.sh" << 'EOLSCRIPT'
#!/bin/bash

# 物流查价系统部署脚本
# 此脚本用于在服务器上部署项目

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始部署物流查价系统...${NC}"

# 检查.env文件
if [ ! -f .env ]; then
  echo -e "${YELLOW}未找到.env文件，将使用.env.example创建${NC}"
  cp .env.example .env
  echo -e "${RED}请编辑.env文件，设置正确的环境变量！${NC}"
  exit 1
fi

# 安装依赖
echo -e "${YELLOW}安装依赖...${NC}"
# 使用--no-fund和--no-audit选项加快安装速度，使用--legacy-peer-deps解决可能的依赖冲突
npm install --no-fund --no-audit --legacy-peer-deps

# 生成Prisma客户端
echo -e "${YELLOW}生成Prisma客户端...${NC}"
npx prisma generate

# 应用数据库迁移
echo -e "${YELLOW}应用数据库迁移...${NC}"
npx prisma db push

# 初始化数据库
echo -e "${YELLOW}初始化数据库...${NC}"
node scripts/init-db.js

# 构建应用
echo -e "${YELLOW}构建应用...${NC}"
npm run build

echo -e "${GREEN}部署完成！${NC}"
echo -e "${YELLOW}您可以使用以下命令启动应用：${NC}"
echo "npm start"
echo ""
echo -e "${YELLOW}或者使用PM2进行管理：${NC}"
echo "pm2 start npm --name \"logistics-price-system\" -- start"
EOLSCRIPT

# 确保脚本可执行
chmod +x "$TEMP_DIR/scripts/deploy.sh"
chmod +x "$TEMP_DIR/scripts/reset-db.sh"
chmod +x "$TEMP_DIR/scripts/init-db.js"

# 创建压缩包
echo -e "${YELLOW}创建压缩包...${NC}"
PACKAGE_NAME="logistics-price-system-$(date +%Y%m%d).zip"
cd "$TEMP_DIR"
zip -r "../$PACKAGE_NAME" .

# 清理临时目录
echo -e "${YELLOW}清理临时目录...${NC}"
cd "$PROJECT_ROOT"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}打包完成！${NC}"
echo "压缩包位置: $PROJECT_ROOT/$PACKAGE_NAME"
echo ""
echo -e "${YELLOW}部署步骤：${NC}"
echo "1. 将压缩包上传到服务器"
echo "2. 解压: unzip $PACKAGE_NAME -d logistics-price-system"
echo "3. 进入目录: cd logistics-price-system"
echo "4. 配置环境变量: cp .env.example .env 并编辑.env文件"
echo "5. 运行部署脚本: ./scripts/deploy.sh"
echo ""
echo -e "${YELLOW}默认管理员账号：${NC}"
echo "用户名: admin"
echo "密码: admin123"
