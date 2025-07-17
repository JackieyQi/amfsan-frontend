#!/bin/bash
# 简单的健康检查脚本

HEALTH_URL="http://localhost:3000/health"
LOG_FILE="/var/log/amfsan-monitor.log"

# 检查应用是否响应
if curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): 应用运行正常" >> $LOG_FILE
else
    echo "$(date): 应用无响应，尝试重启" >> $LOG_FILE
    sudo systemctl restart amfsan
fi
