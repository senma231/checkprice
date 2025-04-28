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
