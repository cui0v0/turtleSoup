#!/bin/bash

# 海龟汤服务器启动脚本 (Python版本)

echo "=== Turtle Soup Server (Python) ==="
echo ""

# 检查 Python 3 是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python 3"
    echo "请先安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

echo "✓ Python 3 已安装: $(python3 --version)"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo ""
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
    echo "✓ 虚拟环境创建成功"
fi

# 激活虚拟环境
echo ""
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo ""
echo "检查并安装依赖..."
pip install -r requirements.txt

# 启动服务器
echo ""
echo "=== 启动服务器 ==="
python3 server.py
