# 1. 构建项目
npm run build

# 2. 设置权限
sudo chown -R www-data:www-data .next/standalone

# 3. 启动服务
sudo systemctl enable amfsan
sudo systemctl start amfsan

# 4. 检查状态
sudo systemctl status amfsan
sudo journalctl -u amfsan -f
