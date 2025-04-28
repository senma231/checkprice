#!/bin/bash

# 物流查价系统服务器初始化和部署脚本
# 此脚本用于检测系统架构、安装必要组件并部署项目

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置日志文件
LOG_FILE="/tmp/logistics-price-system-deploy-$(date +%Y%m%d%H%M%S).log"

# 项目配置
GITHUB_REPO="https://github.com/senma231/checkprice.git"
PROJECT_DIR="/www/wwwroot/logistics-price-system"
NODE_VERSION_REQUIRED="18.0.0"
POSTGRES_VERSION_REQUIRED="14.0"

# 记录日志函数
log() {
  echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 检查命令是否存在
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 检查是否为root用户
check_root() {
  if [ "$(id -u)" != "0" ]; then
    log "${RED}错误: 此脚本需要root权限运行${NC}"
    log "${YELLOW}请使用 sudo 或以root用户身份运行此脚本${NC}"
    exit 1
  fi
}

# 检测系统架构和发行版
detect_system() {
  log "${BLUE}检测系统架构和发行版...${NC}"
  
  # 检测架构
  ARCH=$(uname -m)
  log "系统架构: $ARCH"
  
  # 检测操作系统类型
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    OS_VERSION=$VERSION_ID
    log "操作系统: $OS $OS_VERSION"
  else
    log "${YELLOW}警告: 无法确定操作系统类型${NC}"
    OS="Unknown"
  fi
  
  # 检测包管理器
  if command_exists apt-get; then
    PKG_MANAGER="apt-get"
    UPDATE_CMD="apt-get update"
    INSTALL_CMD="apt-get install -y"
  elif command_exists yum; then
    PKG_MANAGER="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
  elif command_exists dnf; then
    PKG_MANAGER="dnf"
    UPDATE_CMD="dnf update -y"
    INSTALL_CMD="dnf install -y"
  else
    log "${RED}错误: 不支持的包管理器${NC}"
    exit 1
  fi
  
  log "包管理器: $PKG_MANAGER"
}

# 更新系统组件
update_system() {
  log "${BLUE}更新系统组件...${NC}"
  
  log "执行: $UPDATE_CMD"
  $UPDATE_CMD >> "$LOG_FILE" 2>&1
  
  # 安装基本工具
  log "安装基本工具..."
  $INSTALL_CMD curl wget git zip unzip ca-certificates gnupg lsb-release >> "$LOG_FILE" 2>&1
  
  log "${GREEN}系统组件更新完成${NC}"
}

# 检查并安装Node.js
install_nodejs() {
  log "${BLUE}检查Node.js...${NC}"
  
  if command_exists node; then
    CURRENT_NODE_VERSION=$(node -v | cut -d "v" -f 2)
    log "当前Node.js版本: $CURRENT_NODE_VERSION"
    
    # 使用sort -V进行版本比较
    if [ "$(printf '%s\n' "$NODE_VERSION_REQUIRED" "$CURRENT_NODE_VERSION" | sort -V | head -n1)" = "$NODE_VERSION_REQUIRED" ]; then
      log "${GREEN}Node.js版本满足要求${NC}"
    else
      log "${YELLOW}Node.js版本过低，需要更新${NC}"
      install_nodejs_version
    fi
  else
    log "${YELLOW}未检测到Node.js，开始安装...${NC}"
    install_nodejs_version
  fi
}

# 安装指定版本的Node.js
install_nodejs_version() {
  log "安装Node.js..."
  
  # 安装nvm
  if ! command_exists nvm; then
    log "安装nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash >> "$LOG_FILE" 2>&1
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
  fi
  
  # 使用nvm安装Node.js
  log "使用nvm安装Node.js..."
  nvm install 18 >> "$LOG_FILE" 2>&1
  nvm use 18 >> "$LOG_FILE" 2>&1
  nvm alias default 18 >> "$LOG_FILE" 2>&1
  
  # 验证安装
  if command_exists node; then
    NEW_NODE_VERSION=$(node -v | cut -d "v" -f 2)
    log "${GREEN}Node.js安装成功，版本: $NEW_NODE_VERSION${NC}"
    
    # 安装全局npm包
    log "安装PM2..."
    npm install -g pm2 >> "$LOG_FILE" 2>&1
  else
    log "${RED}Node.js安装失败${NC}"
    exit 1
  fi
}

# 检查并安装PostgreSQL
install_postgresql() {
  log "${BLUE}检查PostgreSQL...${NC}"
  
  if command_exists psql; then
    CURRENT_PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1,2)
    log "当前PostgreSQL版本: $CURRENT_PG_VERSION"
    
    # 使用sort -V进行版本比较
    if [ "$(printf '%s\n' "$POSTGRES_VERSION_REQUIRED" "$CURRENT_PG_VERSION" | sort -V | head -n1)" = "$POSTGRES_VERSION_REQUIRED" ]; then
      log "${GREEN}PostgreSQL版本满足要求${NC}"
    else
      log "${YELLOW}PostgreSQL版本过低，需要更新${NC}"
      install_postgresql_version
    fi
  else
    log "${YELLOW}未检测到PostgreSQL，开始安装...${NC}"
    install_postgresql_version
  fi
}

# 安装指定版本的PostgreSQL
install_postgresql_version() {
  log "安装PostgreSQL..."
  
  # 根据不同的包管理器安装PostgreSQL
  if [ "$PKG_MANAGER" = "apt-get" ]; then
    # 添加PostgreSQL官方源
    log "添加PostgreSQL官方源..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update >> "$LOG_FILE" 2>&1
    
    # 安装PostgreSQL
    log "安装PostgreSQL 14..."
    apt-get install -y postgresql-14 postgresql-contrib-14 >> "$LOG_FILE" 2>&1
  elif [ "$PKG_MANAGER" = "yum" ] || [ "$PKG_MANAGER" = "dnf" ]; then
    # 添加PostgreSQL官方源
    log "添加PostgreSQL官方源..."
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-$(rpm -E %{rhel})-x86_64/pgdg-redhat-repo-latest.noarch.rpm >> "$LOG_FILE" 2>&1
    
    # 安装PostgreSQL
    log "安装PostgreSQL 14..."
    $INSTALL_CMD postgresql14-server postgresql14-contrib >> "$LOG_FILE" 2>&1
    
    # 初始化数据库
    log "初始化PostgreSQL数据库..."
    /usr/pgsql-14/bin/postgresql-14-setup initdb >> "$LOG_FILE" 2>&1
    
    # 启动并启用服务
    systemctl enable postgresql-14 >> "$LOG_FILE" 2>&1
    systemctl start postgresql-14 >> "$LOG_FILE" 2>&1
  fi
  
  # 验证安装
  if command_exists psql; then
    NEW_PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1,2)
    log "${GREEN}PostgreSQL安装成功，版本: $NEW_PG_VERSION${NC}"
    
    # 配置PostgreSQL
    log "配置PostgreSQL..."
    
    # 切换到postgres用户
    su - postgres -c "psql -c \"CREATE USER logistics_user WITH PASSWORD 'logistics_password';\"" >> "$LOG_FILE" 2>&1
    su - postgres -c "psql -c \"CREATE DATABASE logistics_db OWNER logistics_user;\"" >> "$LOG_FILE" 2>&1
    
    log "${GREEN}PostgreSQL配置完成${NC}"
  else
    log "${RED}PostgreSQL安装失败${NC}"
    exit 1
  fi
}

# 创建必要的文件
create_required_files() {
  log "${BLUE}创建必要的文件...${NC}"
  
  # 创建.env.example文件
  log "创建.env.example文件..."
  cat > "$PROJECT_DIR/.env.example" << EOF
# 数据库连接
DATABASE_URL="postgresql://logistics_user:your_secure_password@localhost:5432/logistics_db"

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# 其他配置
NODE_ENV="production"
EOF
  
  # 创建deploy.sh脚本
  log "创建deploy.sh脚本..."
  mkdir -p "$PROJECT_DIR/scripts"
  cat > "$PROJECT_DIR/scripts/deploy.sh" << 'EOF'
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
if [ -f scripts/init-db.js ]; then
  node scripts/init-db.js
else
  echo -e "${YELLOW}未找到init-db.js脚本，跳过数据库初始化${NC}"
fi

# 构建应用
echo -e "${YELLOW}构建应用...${NC}"
npm run build

echo -e "${GREEN}部署完成！${NC}"
echo -e "${YELLOW}您可以使用以下命令启动应用：${NC}"
echo "npm start"
echo ""
echo -e "${YELLOW}或者使用PM2进行管理：${NC}"
echo "pm2 start npm --name \"logistics-price-system\" -- start"
EOF
  
  # 创建init-db.js脚本
  log "创建init-db.js脚本..."
  cat > "$PROJECT_DIR/scripts/init-db.js" << 'EOF'
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
EOF
  
  # 设置执行权限
  chmod +x "$PROJECT_DIR/scripts/deploy.sh"
  
  log "${GREEN}必要文件创建完成${NC}"
}

# 从GitHub拉取项目
clone_project() {
  log "${BLUE}从GitHub拉取项目...${NC}"
  
  # 检查项目目录是否存在
  if [ -d "$PROJECT_DIR" ]; then
    log "${YELLOW}项目目录已存在，将备份并重新克隆${NC}"
    mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d%H%M%S)"
  fi
  
  # 创建项目目录
  mkdir -p "$PROJECT_DIR"
  
  # 克隆项目
  log "克隆项目: $GITHUB_REPO"
  git clone "$GITHUB_REPO" "$PROJECT_DIR" >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    log "${GREEN}项目克隆成功${NC}"
    
    # 创建必要的文件
    create_required_files
  else
    log "${RED}项目克隆失败${NC}"
    exit 1
  fi
}

# 部署项目
deploy_project() {
  log "${BLUE}开始部署项目...${NC}"
  
  # 进入项目目录
  cd "$PROJECT_DIR" || exit 1
  
  # 创建.env文件
  log "创建.env文件..."
  cp .env.example .env
  
  # 修改.env文件中的数据库连接信息
  log "配置数据库连接..."
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://logistics_user:logistics_password@localhost:5432/logistics_db"|g' .env
  
  # 修改.env文件中的NextAuth配置
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  SERVER_IP=$(hostname -I | awk '{print $1}')
  
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://$SERVER_IP:3000\"|g" .env
  sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|g" .env
  
  # 运行部署脚本
  log "运行部署脚本..."
  chmod +x scripts/deploy.sh
  ./scripts/deploy.sh >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    log "${GREEN}项目部署成功${NC}"
    
    # 使用PM2启动项目
    log "使用PM2启动项目..."
    pm2 start npm --name "logistics-price-system" -- start >> "$LOG_FILE" 2>&1
    pm2 save >> "$LOG_FILE" 2>&1
    
    log "${GREEN}项目已成功启动${NC}"
    log "您可以通过以下地址访问系统: http://$SERVER_IP:3000"
    log "默认管理员账号: admin"
    log "默认管理员密码: admin123"
  else
    log "${RED}项目部署失败，请查看日志文件: $LOG_FILE${NC}"
    exit 1
  fi
}

# 配置Nginx（如果存在）
configure_nginx() {
  log "${BLUE}检查Nginx...${NC}"
  
  if command_exists nginx; then
    log "配置Nginx反向代理..."
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # 创建Nginx配置文件
    cat > /etc/nginx/conf.d/logistics-price-system.conf << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # 测试Nginx配置
    nginx -t >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      # 重启Nginx
      systemctl restart nginx >> "$LOG_FILE" 2>&1
      log "${GREEN}Nginx配置成功${NC}"
      log "您可以通过以下地址访问系统: http://$SERVER_IP"
    else
      log "${RED}Nginx配置失败，请查看日志文件: $LOG_FILE${NC}"
    fi
  else
    log "${YELLOW}未检测到Nginx，跳过配置${NC}"
  fi
}

# 主函数
main() {
  log "${GREEN}========== 物流查价系统服务器初始化和部署脚本 ==========${NC}"
  
  # 检查root权限
  check_root
  
  # 检测系统
  detect_system
  
  # 更新系统
  update_system
  
  # 安装Node.js
  install_nodejs
  
  # 安装PostgreSQL
  install_postgresql
  
  # 从GitHub拉取项目
  clone_project
  
  # 部署项目
  deploy_project
  
  # 配置Nginx
  configure_nginx
  
  log "${GREEN}========== 部署完成 ==========${NC}"
  log "日志文件: $LOG_FILE"
}

# 执行主函数
main
