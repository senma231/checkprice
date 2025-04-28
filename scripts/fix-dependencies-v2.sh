#!/bin/bash

# 物流查价系统依赖修复脚本 v2
# 此脚本用于修复依赖问题和安装缺失的模块

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置日志文件
LOG_FILE="/tmp/logistics-price-system-fix-deps-$(date +%Y%m%d%H%M%S).log"

# 项目目录
PROJECT_DIR="/www/wwwroot/logistics-price-system"

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

# 修复package.json中的依赖冲突
fix_package_json() {
  log "${BLUE}修复package.json中的依赖冲突...${NC}"
  
  # 备份原始package.json
  cp "$PROJECT_DIR/package.json" "$PROJECT_DIR/package.json.bak.$(date +%Y%m%d%H%M%S)"
  
  # 移除@ant-design/v5-patch-for-react-19依赖，因为它需要React 19
  log "移除@ant-design/v5-patch-for-react-19依赖..."
  sed -i '/"@ant-design\/v5-patch-for-react-19"/d' "$PROJECT_DIR/package.json"
  
  # 确保React和React DOM版本固定为18.2.0
  log "固定React和React DOM版本为18.2.0..."
  sed -i 's/"react": ".*"/"react": "18.2.0"/g' "$PROJECT_DIR/package.json"
  sed -i 's/"react-dom": ".*"/"react-dom": "18.2.0"/g' "$PROJECT_DIR/package.json"
  
  # 添加xlsx依赖
  log "添加xlsx依赖..."
  # 使用临时文件进行替换，确保格式正确
  TEMP_FILE=$(mktemp)
  awk '
  {
    if ($0 ~ /"dependencies": {/) {
      print $0;
      print "    \"xlsx\": \"^0.18.5\",";
    } else {
      print $0;
    }
  }' "$PROJECT_DIR/package.json" > "$TEMP_FILE"
  
  mv "$TEMP_FILE" "$PROJECT_DIR/package.json"
  
  log "${GREEN}package.json修复完成${NC}"
}

# 修复AntdProvider.tsx文件
fix_antd_provider() {
  log "${BLUE}修复AntdProvider.tsx文件...${NC}"
  
  ANTD_PROVIDER_FILE="$PROJECT_DIR/src/providers/AntdProvider.tsx"
  
  # 检查文件是否存在
  if [ ! -f "$ANTD_PROVIDER_FILE" ]; then
    log "${RED}错误: AntdProvider.tsx文件不存在: $ANTD_PROVIDER_FILE${NC}"
    return 1
  fi
  
  # 备份原始文件
  cp "$ANTD_PROVIDER_FILE" "${ANTD_PROVIDER_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  
  # 修改文件，移除对@ant-design/v5-patch-for-react-19的引用
  log "移除对@ant-design/v5-patch-for-react-19的引用..."
  
  # 使用临时文件进行替换
  TEMP_FILE=$(mktemp)
  
  # 读取文件内容
  cat "$ANTD_PROVIDER_FILE" > "$TEMP_FILE.original"
  
  # 检查文件内容
  log "检查AntdProvider.tsx文件内容..."
  cat "$TEMP_FILE.original" | grep -n "@ant-design/v5-patch-for-react-19" >> "$LOG_FILE" 2>&1
  
  # 移除import语句
  sed -i '/import.*@ant-design\/v5-patch-for-react-19/d' "$TEMP_FILE.original"
  
  # 移除使用语句
  sed -i '/v5PatchForReact19/d' "$TEMP_FILE.original"
  
  # 保存修改后的文件
  cat "$TEMP_FILE.original" > "$ANTD_PROVIDER_FILE"
  
  # 清理临时文件
  rm -f "$TEMP_FILE.original" "$TEMP_FILE"
  
  log "${GREEN}AntdProvider.tsx文件修复完成${NC}"
}

# 清理node_modules和缓存
clean_node_modules() {
  log "${BLUE}清理node_modules和npm缓存...${NC}"
  
  cd "$PROJECT_DIR" || exit 1
  
  # 删除node_modules目录
  log "删除node_modules目录..."
  rm -rf node_modules
  
  # 删除.next目录
  log "删除.next目录..."
  rm -rf .next
  
  # 清理npm缓存
  log "清理npm缓存..."
  npm cache clean --force >> "$LOG_FILE" 2>&1
  
  log "${GREEN}清理完成${NC}"
}

# 重新安装依赖
reinstall_dependencies() {
  log "${BLUE}重新安装依赖...${NC}"
  
  cd "$PROJECT_DIR" || exit 1
  
  # 使用--legacy-peer-deps安装依赖
  log "使用--legacy-peer-deps安装依赖..."
  npm install --legacy-peer-deps --no-fund --no-audit >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    log "${RED}依赖安装失败，尝试使用--force选项...${NC}"
    npm install --force --no-fund --no-audit >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      log "${RED}依赖安装失败，请查看日志文件: $LOG_FILE${NC}"
      return 1
    fi
  fi
  
  log "${GREEN}依赖安装成功${NC}"
  return 0
}

# 重新构建项目
rebuild_project() {
  log "${BLUE}重新构建项目...${NC}"
  
  cd "$PROJECT_DIR" || exit 1
  
  # 生成Prisma客户端
  log "生成Prisma客户端..."
  npx prisma generate >> "$LOG_FILE" 2>&1
  
  # 构建项目
  log "构建项目..."
  npm run build >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    log "${RED}项目构建失败，请查看日志文件: $LOG_FILE${NC}"
    return 1
  fi
  
  log "${GREEN}项目构建成功${NC}"
  return 0
}

# 重启应用
restart_app() {
  log "${BLUE}重启应用...${NC}"
  
  # 检查PM2是否存在
  if ! command_exists pm2; then
    log "${RED}错误: 未检测到PM2，请先安装PM2${NC}"
    log "npm install -g pm2"
    return 1
  fi
  
  # 检查应用是否在运行
  if pm2 list | grep -q "logistics-price-system"; then
    log "重启应用..."
    pm2 restart logistics-price-system >> "$LOG_FILE" 2>&1
  else
    log "启动应用..."
    cd "$PROJECT_DIR" || exit 1
    pm2 start npm --name "logistics-price-system" -- start >> "$LOG_FILE" 2>&1
  fi
  
  if [ $? -ne 0 ]; then
    log "${RED}应用启动失败，请查看日志文件: $LOG_FILE${NC}"
    return 1
  fi
  
  # 保存PM2配置
  pm2 save >> "$LOG_FILE" 2>&1
  
  log "${GREEN}应用已重启${NC}"
  return 0
}

# 主函数
main() {
  log "${GREEN}========== 物流查价系统依赖修复脚本 v2 ==========${NC}"
  
  # 检查root权限
  check_root
  
  # 检查项目目录是否存在
  if [ ! -d "$PROJECT_DIR" ]; then
    log "${RED}错误: 项目目录不存在: $PROJECT_DIR${NC}"
    exit 1
  fi
  
  # 修复package.json
  fix_package_json
  
  # 修复AntdProvider.tsx文件
  fix_antd_provider
  
  # 清理node_modules和缓存
  clean_node_modules
  
  # 重新安装依赖
  reinstall_dependencies
  
  # 重新构建项目
  rebuild_project
  
  # 重启应用
  restart_app
  
  log "${GREEN}========== 依赖修复完成 ==========${NC}"
  log "日志文件: $LOG_FILE"
}

# 执行主函数
main
