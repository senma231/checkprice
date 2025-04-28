#!/bin/bash

# 物流查价系统依赖安装脚本
# 此脚本专门用于安装系统所需的依赖，包括Node.js、PM2和Nginx

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置日志文件
LOG_FILE="/tmp/logistics-price-system-dependencies-$(date +%Y%m%d%H%M%S).log"

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
  $INSTALL_CMD curl wget git zip unzip ca-certificates gnupg lsb-release build-essential >> "$LOG_FILE" 2>&1
  
  log "${GREEN}系统组件更新完成${NC}"
}

# 安装Node.js (使用二进制包直接安装)
install_nodejs_binary() {
  log "${BLUE}使用二进制包安装Node.js...${NC}"
  
  # 设置Node.js版本和下载URL
  NODE_VERSION="18.18.2"
  
  # 根据架构选择下载URL
  if [ "$ARCH" = "x86_64" ]; then
    NODE_ARCH="x64"
  elif [ "$ARCH" = "aarch64" ]; then
    NODE_ARCH="arm64"
  else
    NODE_ARCH="x64"
    log "${YELLOW}警告: 未知架构 $ARCH，使用默认x64架构${NC}"
  fi
  
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  NODE_DIR="/usr/local/lib/nodejs"
  NODE_BASENAME="node-v${NODE_VERSION}-linux-${NODE_ARCH}"
  
  log "下载Node.js二进制包: $NODE_URL"
  
  # 创建目录
  mkdir -p "$NODE_DIR"
  
  # 下载并解压Node.js
  cd /tmp
  wget "$NODE_URL" -O "node.tar.xz" >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    log "${RED}Node.js下载失败，请检查网络连接${NC}"
    return 1
  fi
  
  tar -xJf "node.tar.xz" >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    log "${RED}Node.js解压失败${NC}"
    return 1
  fi
  
  # 复制到目标目录
  cp -r "$NODE_BASENAME"/* "$NODE_DIR/"
  
  # 创建符号链接
  ln -sf "$NODE_DIR/bin/node" /usr/bin/node
  ln -sf "$NODE_DIR/bin/npm" /usr/bin/npm
  ln -sf "$NODE_DIR/bin/npx" /usr/bin/npx
  
  # 清理临时文件
  rm -rf "node.tar.xz" "$NODE_BASENAME"
  
  # 验证安装
  if command_exists node; then
    NODE_INSTALLED_VERSION=$(node -v)
    log "${GREEN}Node.js安装成功，版本: $NODE_INSTALLED_VERSION${NC}"
    
    # 配置npm
    npm config set registry https://registry.npmmirror.com/ >> "$LOG_FILE" 2>&1
    log "已设置npm镜像为淘宝镜像"
    
    return 0
  else
    log "${RED}Node.js安装失败${NC}"
    return 1
  fi
}

# 安装PM2
install_pm2() {
  log "${BLUE}安装PM2...${NC}"
  
  if ! command_exists node; then
    log "${RED}错误: 未检测到Node.js，请先安装Node.js${NC}"
    return 1
  fi
  
  log "使用npm全局安装PM2..."
  npm install -g pm2 >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ] && command_exists pm2; then
    log "${GREEN}PM2安装成功${NC}"
    
    # 设置PM2开机自启
    log "设置PM2开机自启..."
    pm2 startup >> "$LOG_FILE" 2>&1
    
    return 0
  else
    log "${RED}PM2安装失败${NC}"
    return 1
  fi
}

# 安装Nginx
install_nginx() {
  log "${BLUE}安装Nginx...${NC}"
  
  # 根据不同的包管理器安装Nginx
  if [ "$PKG_MANAGER" = "apt-get" ]; then
    # 添加Nginx官方源
    log "添加Nginx官方源..."
    curl -fsSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg >> "$LOG_FILE" 2>&1
    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/mainline/debian $(lsb_release -cs) nginx" > /etc/apt/sources.list.d/nginx.list
    
    # 更新源并安装Nginx
    apt-get update >> "$LOG_FILE" 2>&1
    apt-get install -y nginx >> "$LOG_FILE" 2>&1
  elif [ "$PKG_MANAGER" = "yum" ] || [ "$PKG_MANAGER" = "dnf" ]; then
    # 添加Nginx官方源
    log "添加Nginx官方源..."
    cat > /etc/yum.repos.d/nginx.repo << EOF
[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/mainline/centos/\$releasever/\$basearch/
gpgcheck=0
enabled=1
EOF
    
    # 安装Nginx
    $INSTALL_CMD nginx >> "$LOG_FILE" 2>&1
  fi
  
  # 验证安装
  if command_exists nginx; then
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d '/' -f 2)
    log "${GREEN}Nginx安装成功，版本: $NGINX_VERSION${NC}"
    
    # 启动Nginx并设置开机自启
    systemctl start nginx >> "$LOG_FILE" 2>&1
    systemctl enable nginx >> "$LOG_FILE" 2>&1
    
    return 0
  else
    log "${RED}Nginx安装失败${NC}"
    return 1
  fi
}

# 安装PostgreSQL
install_postgresql() {
  log "${BLUE}安装PostgreSQL...${NC}"
  
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
    PG_VERSION=$(psql --version | awk '{print $3}')
    log "${GREEN}PostgreSQL安装成功，版本: $PG_VERSION${NC}"
    
    # 配置PostgreSQL
    log "配置PostgreSQL..."
    
    # 切换到postgres用户
    su - postgres -c "psql -c \"CREATE USER logistics_user WITH PASSWORD 'logistics_password';\"" >> "$LOG_FILE" 2>&1
    su - postgres -c "psql -c \"CREATE DATABASE logistics_db OWNER logistics_user;\"" >> "$LOG_FILE" 2>&1
    
    log "${GREEN}PostgreSQL配置完成${NC}"
    return 0
  else
    log "${RED}PostgreSQL安装失败${NC}"
    return 1
  fi
}

# 显示菜单
show_menu() {
  echo -e "${GREEN}========== 物流查价系统依赖安装脚本 ==========${NC}"
  echo -e "${YELLOW}请选择要安装的组件:${NC}"
  echo "1) 安装Node.js"
  echo "2) 安装PM2"
  echo "3) 安装Nginx"
  echo "4) 安装PostgreSQL"
  echo "5) 安装所有组件"
  echo "0) 退出"
  echo -e "${GREEN}===========================================${NC}"
  
  read -p "请输入选项 [0-5]: " choice
  
  case $choice in
    1)
      install_nodejs_binary
      ;;
    2)
      install_pm2
      ;;
    3)
      install_nginx
      ;;
    4)
      install_postgresql
      ;;
    5)
      update_system && 
      install_nodejs_binary && 
      install_pm2 && 
      install_nginx && 
      install_postgresql
      ;;
    0)
      log "退出脚本"
      exit 0
      ;;
    *)
      log "${RED}无效的选项，请重新选择${NC}"
      show_menu
      ;;
  esac
  
  echo ""
  read -p "按Enter键返回主菜单..."
  show_menu
}

# 主函数
main() {
  log "${GREEN}========== 物流查价系统依赖安装脚本 ==========${NC}"
  
  # 检查root权限
  check_root
  
  # 检测系统
  detect_system
  
  # 显示菜单
  show_menu
  
  log "${GREEN}========== 安装完成 ==========${NC}"
  log "日志文件: $LOG_FILE"
}

# 执行主函数
main
