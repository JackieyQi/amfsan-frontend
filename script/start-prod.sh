#!/bin/bash
# 生产环境启动脚本

# 设置环境变量
export NODE_ENV=production
export PORT=3000

# 检查是否已经运行
if pgrep -f "node.*server.js" > /dev/null; then
    echo "应用已在运行，正在重启..."
    pkill -f "node.*server.js"
    sleep 2
fi

# 启动应用
cd .next/standalone
nohup node server.js > /var/log/amfsan.log 2>&1 &

echo "应用已启动，PID: $!"
echo "日志文件: /var/log/amfsan.log"
