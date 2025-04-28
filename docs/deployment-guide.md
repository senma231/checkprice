# 物流查价系统部署指南

本文档提供了在生产环境中部署物流查价系统的详细步骤。

## 系统要求

- Node.js 18.x 或更高版本
- PostgreSQL 14.x 或更高版本
- 至少 2GB RAM
- 至少 20GB 磁盘空间

## 部署步骤

### 1. 准备服务器环境

#### 安装 Node.js

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 配置 PostgreSQL

```bash
# 创建数据库用户和数据库
sudo -u postgres psql

CREATE USER logistics_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE logistics_db OWNER logistics_user;
\q
```

### 2. 获取应用代码

```bash
# 克隆代码仓库
git clone https://your-repository-url.git
cd logistics-price-system
```

### 3. 配置环境变量

创建 `.env` 文件并配置以下环境变量：

```
# 数据库连接
DATABASE_URL="postgresql://logistics_user:your_secure_password@localhost:5432/logistics_db"

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# 其他配置
NODE_ENV="production"
```

### 4. 安装依赖并构建应用

```bash
# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 应用数据库迁移
npx prisma migrate deploy

# 初始化默认数据
npm run db:seed

# 构建应用
npm run build
```

### 5. 使用 PM2 运行应用

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "logistics-price-system" -- start

# 设置开机自启
pm2 startup
pm2 save
```

### 6. 配置 Nginx 反向代理

安装 Nginx：

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/logistics-price-system
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启 Nginx：

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/logistics-price-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# CentOS/RHEL
sudo ln -s /etc/nginx/sites-available/logistics-price-system /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. 配置 HTTPS（推荐）

使用 Certbot 获取 SSL 证书：

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 8. 设置定期备份

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash

# 备份数据库
pg_dump -U logistics_user -d logistics_db > /path/to/backups/logistics_db_$(date +%Y%m%d).sql

# 压缩备份
gzip /path/to/backups/logistics_db_$(date +%Y%m%d).sql

# 删除7天前的备份
find /path/to/backups/ -name "logistics_db_*.sql.gz" -mtime +7 -delete
```

设置定时任务：

```bash
chmod +x backup.sh
crontab -e

# 添加以下行，每天凌晨2点执行备份
0 2 * * * /path/to/backup.sh
```

## 系统维护

### 更新应用

```bash
# 进入应用目录
cd /path/to/logistics-price-system

# 拉取最新代码
git pull

# 安装依赖
npm install

# 应用数据库迁移
npx prisma migrate deploy

# 重新构建应用
npm run build

# 重启应用
pm2 restart logistics-price-system
```

### 监控应用

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs logistics-price-system

# 监控资源使用
pm2 monit
```

### 重置数据库（谨慎使用）

如需重置数据库并初始化默认数据，可以使用提供的脚本：

```bash
./scripts/reset-db.sh
```

重置后的默认管理员账号：
- 用户名：admin
- 密码：admin123

**注意：** 在生产环境中重置数据库将删除所有现有数据，请确保已备份重要数据。

## 故障排除

### 应用无法启动

1. 检查环境变量配置
2. 检查数据库连接
3. 查看应用日志：`pm2 logs logistics-price-system`

### 数据库连接问题

1. 确认 PostgreSQL 服务正在运行：`sudo systemctl status postgresql`
2. 检查数据库用户权限
3. 验证 `.env` 文件中的数据库连接字符串

### Nginx 配置问题

1. 检查 Nginx 配置语法：`sudo nginx -t`
2. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`
3. 确认 Nginx 服务正在运行：`sudo systemctl status nginx`

## 联系支持

如有任何部署或使用问题，请联系系统管理员或开发团队。
