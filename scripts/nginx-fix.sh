#!/bin/bash

# 物流查价系统Nginx配置修复脚本
# 此脚本用于修复Nginx配置问题

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置日志文件
LOG_FILE="/tmp/logistics-price-system-nginx-fix-$(date +%Y%m%d%H%M%S).log"

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

# 配置Nginx
configure_nginx() {
  log "${BLUE}开始修复Nginx配置...${NC}"
  
  if ! command_exists nginx; then
    log "${RED}错误: 未检测到Nginx，请先安装Nginx${NC}"
    exit 1
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
  log "创建Nginx配置文件: $CONFIG_FILE"
  
  cat > "$CONFIG_FILE" << EOF
# 物流查价系统 - Nginx配置
# 创建时间: $(date '+%Y-%m-%d %H:%M:%S')

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
  
  # 修改NextAuth配置
  ENV_FILE="/www/wwwroot/logistics-price-system/.env"
  if [ -f "$ENV_FILE" ]; then
    log "更新NextAuth配置..."
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://$PUBLIC_IP\"|g" "$ENV_FILE"
    log "NextAuth配置已更新"
  else
    log "${YELLOW}警告: 未找到.env文件，无法更新NextAuth配置${NC}"
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
    fi
  else
    log "${RED}Nginx配置测试失败，请查看日志文件: $LOG_FILE${NC}"
    # 显示Nginx错误信息
    nginx -t 2>> "$LOG_FILE"
  fi
}

# 主函数
main() {
  log "${GREEN}========== 物流查价系统Nginx配置修复脚本 ==========${NC}"
  
  # 检查root权限
  check_root
  
  # 配置Nginx
  configure_nginx
  
  log "${GREEN}========== 修复完成 ==========${NC}"
  log "日志文件: $LOG_FILE"
}

# 执行主函数
main
