#!/bin/bash
# 生产环境启动脚本

# 项目路径
PROJECT_DIR="~/AmfSan_frontend/amfsan-frontend"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"

# 检查 standalone 目录是否存在
if [ ! -d "$STANDALONE_DIR" ]; then
    echo "错误：standalone 目录不存在，请先运行 npm run build"
    exit 1
fi

# 确保静态文件存在
if [ ! -d "$STANDALONE_DIR/.next/static" ]; then
    echo "复制静态文件到 standalone 目录..."
    mkdir -p "$STANDALONE_DIR/.next"
    cp -r "$PROJECT_DIR/.next/static" "$STANDALONE_DIR/.next/"
fi

# 检查是否已有进程在运行
if pgrep -f "node.*server.js" > /dev/null; then
    echo "停止现有进程..."
    pkill -f "node.*server.js"
    sleep 2
fi

# 启动 standalone 服务器
cd "$STANDALONE_DIR"
echo "启动 standalone 服务器..."
nohup node server.js > /tmp/amfsan-frontend-standalone.log 2>&1 &

echo "Standalone 服务器已启动，PID: $!"
echo "日志文件: /var/log/amfsan-standalone.log"
echo "访问地址: http://localhost:3000"
