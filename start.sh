#!/bin/bash

echo "🐢 启动海龟汤游戏服务..."
echo ""

# 检查 Python 后端是否在运行
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  后端服务器已在 5000 端口运行"
else
    echo "🚀 启动后端服务器 (端口 5000)..."
    python3 server.py &
    BACKEND_PID=$!
    sleep 2
fi

# 检查 Vite 前端是否在运行
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  前端服务器已在 3000 端口运行"
else
    echo "🚀 启动前端服务器 (端口 3000)..."
    npm run dev &
    FRONTEND_PID=$!
fi

echo ""
echo "✅ 服务启动完成！"
echo "📱 前端地址: http://localhost:3000"
echo "🔌 后端地址: http://localhost:5000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait
