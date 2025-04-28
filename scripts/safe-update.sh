#!/bin/bash

# 物流查价系统安全更新脚本
# 此脚本用于安全地更新已部署的系统，不会清除现有配置

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置日志文件
LOG_FILE="/tmp/logistics-price-system-update-$(date +%Y%m%d%H%M%S).log"

# 项目配置
GITHUB_REPO="https://github.com/senma231/checkprice.git"
PROJECT_DIR="/www/wwwroot/logistics-price-system"
BACKUP_DIR="/www/wwwroot/logistics-price-system-backups"

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

# 备份函数
backup_file() {
  local file_path="$1"
  local backup_path="${file_path}.bak.$(date +%Y%m%d%H%M%S)"
  
  if [ -f "$file_path" ]; then
    log "备份文件: $file_path -> $backup_path"
    cp "$file_path" "$backup_path"
    return 0
  else
    log "${YELLOW}文件不存在，无需备份: $file_path${NC}"
    return 1
  fi
}

# 备份目录函数
backup_directory() {
  local dir_path="$1"
  local backup_name="$(basename "$dir_path")-$(date +%Y%m%d%H%M%S)"
  local backup_path="$BACKUP_DIR/$backup_name"
  
  if [ -d "$dir_path" ]; then
    mkdir -p "$BACKUP_DIR"
    log "备份目录: $dir_path -> $backup_path"
    cp -r "$dir_path" "$backup_path"
    return 0
  else
    log "${YELLOW}目录不存在，无需备份: $dir_path${NC}"
    return 1
  fi
}

# 更新代码
update_code() {
  log "${BLUE}更新代码...${NC}"
  
  if [ ! -d "$PROJECT_DIR" ]; then
    log "${RED}错误: 项目目录不存在: $PROJECT_DIR${NC}"
    log "请先运行完整的部署脚本: server-init-deploy.sh"
    return 1
  fi
  
  # 备份当前代码
  backup_directory "$PROJECT_DIR"
  
  # 进入项目目录
  cd "$PROJECT_DIR" || return 1
  
  # 检查是否是Git仓库
  if [ -d ".git" ]; then
    log "检测到Git仓库，使用git pull更新代码..."
    
    # 保存当前的修改（如果有）
    if [ -n "$(git status --porcelain)" ]; then
      log "${YELLOW}检测到本地修改，保存到stash...${NC}"
      git stash save "自动保存的修改 $(date +%Y%m%d%H%M%S)" >> "$LOG_FILE" 2>&1
    fi
    
    # 拉取最新代码
    log "拉取最新代码..."
    git pull origin master >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      log "${GREEN}代码更新成功${NC}"
    else
      log "${RED}代码更新失败，请查看日志: $LOG_FILE${NC}"
      return 1
    fi
  else
    log "${YELLOW}不是Git仓库，使用临时目录克隆最新代码...${NC}"
    
    # 创建临时目录
    local temp_dir="/tmp/logistics-price-system-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$temp_dir"
    
    # 克隆最新代码
    log "克隆最新代码到临时目录..."
    git clone "$GITHUB_REPO" "$temp_dir" >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      log "${RED}代码克隆失败，请查看日志: $LOG_FILE${NC}"
      rm -rf "$temp_dir"
      return 1
    fi
    
    # 保存重要文件
    log "保存重要配置文件..."
    local important_files=(".env" "prisma/schema.prisma")
    
    for file in "${important_files[@]}"; do
      if [ -f "$PROJECT_DIR/$file" ]; then
        log "保存文件: $file"
        cp "$PROJECT_DIR/$file" "/tmp/$(basename "$file").bak.$(date +%Y%m%d%H%M%S)"
      fi
    done
    
    # 复制新代码（排除.git目录和node_modules）
    log "复制新代码到项目目录..."
    rsync -av --exclude='.git' --exclude='node_modules' "$temp_dir/" "$PROJECT_DIR/" >> "$LOG_FILE" 2>&1
    
    # 恢复重要文件
    for file in "${important_files[@]}"; do
      local backup_file="/tmp/$(basename "$file").bak.$(date +%Y%m%d%H%M%S)"
      if [ -f "$backup_file" ]; then
        log "恢复文件: $file"
        cp "$backup_file" "$PROJECT_DIR/$file"
        rm "$backup_file"
      fi
    done
    
    # 清理临时目录
    rm -rf "$temp_dir"
    
    log "${GREEN}代码更新成功${NC}"
  fi
  
  return 0
}

# 更新Nginx配置
update_nginx() {
  log "${BLUE}更新Nginx配置...${NC}"
  
  if ! command_exists nginx; then
    log "${RED}错误: 未检测到Nginx，请先安装Nginx${NC}"
    return 1
  fi
  
  # 获取公网IP（通过外部服务）
  log "获取公网IP..."
  PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ipinfo.io/ip || curl -s https://ifconfig.me)
  
  if [ -z "$PUBLIC_IP" ]; then
    log "${YELLOW}警告: 无法获取公网IP，将使用内网IP${NC}"
    PUBLIC_IP=$(hostname -I | awk '{print $1}')
  fi
  
  log "公网IP: $PUBLIC_IP"
  
  # 检测Nginx配置目录
  NGINX_CONF_DIR="/etc/nginx/conf.d"
  if [ ! -d "$NGINX_CONF_DIR" ] && [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONF_DIR="/etc/nginx/sites-available"
    NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
    log "使用Nginx sites-available目录: $NGINX_CONF_DIR"
  else
    log "使用Nginx conf.d目录: $NGINX_CONF_DIR"
  fi
  
  # 创建Nginx配置文件
  CONFIG_FILE="$NGINX_CONF_DIR/logistics-price-system.conf"
  
  # 备份现有配置
  backup_file "$CONFIG_FILE"
  
  log "创建Nginx配置文件: $CONFIG_FILE"
  
  cat > "$CONFIG_FILE" << EOF
# 物流查价系统 - Nginx配置
# 创建时间: $(date '+%Y-%m-%d %H:%M:%S')
# 由safe-update.sh脚本自动生成

server {
    # 仅监听IPv4
    listen 80;
    # 不监听IPv6
    # listen [::]:80;
    
    # 使用公网IP和localhost作为服务器名称
    server_name $PUBLIC_IP localhost;
    
    # 访问日志
    access_log /var/log/nginx/logistics-price-system-access.log;
    error_log /var/log/nginx/logistics-price-system-error.log;

    # 反向代理到Node.js应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 增加超时时间，防止长请求被中断
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
  
  # 如果使用sites-available，创建符号链接到sites-enabled
  if [ "$NGINX_CONF_DIR" = "/etc/nginx/sites-available" ]; then
    log "创建符号链接到sites-enabled目录..."
    ln -sf "$CONFIG_FILE" "$NGINX_ENABLED_DIR/$(basename "$CONFIG_FILE")"
  fi
  
  # 测试Nginx配置
  log "测试Nginx配置..."
  nginx -t >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    # 重启Nginx
    log "重启Nginx服务..."
    systemctl restart nginx >> "$LOG_FILE" 2>&1
    
    log "${GREEN}Nginx配置成功${NC}"
    log "您可以通过以下地址访问系统: http://$PUBLIC_IP"
    
    # 检查Nginx是否成功启动
    if systemctl is-active --quiet nginx; then
      log "${GREEN}Nginx服务已成功启动${NC}"
    else
      log "${RED}Nginx服务启动失败，请检查日志${NC}"
      systemctl status nginx >> "$LOG_FILE" 2>&1
      return 1
    fi
  else
    log "${RED}Nginx配置测试失败，请查看日志文件: $LOG_FILE${NC}"
    # 显示Nginx错误信息
    nginx -t 2>> "$LOG_FILE"
    return 1
  fi
  
  return 0
}

# 更新NextAuth配置
update_nextauth() {
  log "${BLUE}更新NextAuth配置...${NC}"
  
  # 获取公网IP（通过外部服务）
  log "获取公网IP..."
  PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ipinfo.io/ip || curl -s https://ifconfig.me)
  
  if [ -z "$PUBLIC_IP" ]; then
    log "${YELLOW}警告: 无法获取公网IP，将使用内网IP${NC}"
    PUBLIC_IP=$(hostname -I | awk '{print $1}')
  fi
  
  log "公网IP: $PUBLIC_IP"
  
  # 修改NextAuth配置
  ENV_FILE="$PROJECT_DIR/.env"
  if [ -f "$ENV_FILE" ]; then
    # 备份.env文件
    backup_file "$ENV_FILE"
    
    log "更新NextAuth配置..."
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://$PUBLIC_IP\"|g" "$ENV_FILE"
    log "NextAuth配置已更新"
    
    return 0
  else
    log "${YELLOW}警告: 未找到.env文件，无法更新NextAuth配置${NC}"
    return 1
  fi
}

# 重启应用
restart_app() {
  log "${BLUE}重启应用...${NC}"
  
  if ! command_exists pm2; then
    log "${RED}错误: 未检测到PM2，请先安装PM2${NC}"
    return 1
  fi
  
  # 检查应用是否在运行
  if pm2 list | grep -q "logistics-price-system"; then
    log "重启应用..."
    pm2 restart logistics-price-system >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      log "${GREEN}应用重启成功${NC}"
      return 0
    else
      log "${RED}应用重启失败，请查看日志: $LOG_FILE${NC}"
      return 1
    fi
  else
    log "${YELLOW}应用未运行，启动应用...${NC}"
    
    cd "$PROJECT_DIR" || return 1
    pm2 start npm --name "logistics-price-system" -- start >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      log "${GREEN}应用启动成功${NC}"
      pm2 save >> "$LOG_FILE" 2>&1
      return 0
    else
      log "${RED}应用启动失败，请查看日志: $LOG_FILE${NC}"
      return 1
    fi
  fi
}

# 显示菜单
show_menu() {
  echo -e "${GREEN}========== 物流查价系统安全更新脚本 ==========${NC}"
  echo -e "${YELLOW}请选择要执行的操作:${NC}"
  echo "1) 更新代码"
  echo "2) 更新Nginx配置"
  echo "3) 更新NextAuth配置"
  echo "4) 重启应用"
  echo "5) 执行所有更新"
  echo "0) 退出"
  echo -e "${GREEN}===========================================${NC}"
  
  read -p "请输入选项 [0-5]: " choice
  
  case $choice in
    1)
      update_code
      ;;
    2)
      update_nginx
      ;;
    3)
      update_nextauth
      ;;
    4)
      restart_app
      ;;
    5)
      update_code && update_nginx && update_nextauth && restart_app
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
  log "${GREEN}========== 物流查价系统安全更新脚本 ==========${NC}"
  
  # 检查root权限
  check_root
  
  # 显示菜单
  show_menu
  
  log "${GREEN}========== 更新完成 ==========${NC}"
  log "日志文件: $LOG_FILE"
}

# 执行主函数
main
