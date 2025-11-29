#!/bin/bash

# 海龟汤游戏 - 一键启动脚本
# 同时启动前后端服务

set -e

echo "🐢 启动海龟汤游戏服务..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  警告: 端口 $1 已被占用${NC}"
        return 0
    else
        return 1
    fi
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止服务...${NC}"
    
    # 停止服务器
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    
    # 确保端口释放
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✅ 服务已停止${NC}"
    exit 0
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 检查端口
if check_port 3000; then
    echo -e "${YELLOW}正在清理 3000 端口...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 启动 Python 服务器（同时提供静态文件和 WebSocket）
echo -e "${GREEN}🚀 启动服务器 (Python + Flask-SocketIO)...${NC}"
echo -e "${GREEN}   - 静态文件服务: public/${NC}"
echo -e "${GREEN}   - WebSocket 服务: Socket.IO${NC}"
python3 server.py &
BACKEND_PID=$!
echo -e "${GREEN}   服务器 PID: $BACKEND_PID${NC}"

# 等待后端启动
sleep 2

# 检查后端是否成功启动
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}❌ 后端启动失败${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}✅ 后端服务器已启动 (http://localhost:5000)${NC}"
echo ""

# 显示状态
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ 服务启动成功！${NC}"
echo ""
echo "📱 游戏地址: http://localhost:3000"
echo "   (Python 服务器提供静态文件 + WebSocket)"
echo ""
echo "服务器 PID: $BACKEND_PID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 等待后端进程
wait $BACKEND_PID
