# 1. 构建项目
npm run build

# 2. 检查 standalone 目录结构
ls -la .next/standalone/

# 3. 确保静态文件被复制到正确位置
# standalone 模式下，静态文件应该在 .next/standalone/.next/static/
ls -la .next/standalone/.next/static/chunks/app/

# 2. 设置权限
sudo chown -R www-data:www-data .next/standalone

# 3. 启动服务
sudo systemctl enable amfsan
sudo systemctl start amfsan

# 4. 检查状态
sudo systemctl status amfsan
sudo journalctl -u amfsan -f
