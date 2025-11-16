#!/bin/bash
# Electron 版启动脚本

cd "$(dirname "$0")"

echo "🚀 启动 Claude Code 万能启动器 (Electron 版)"
echo "================================"

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js,请先安装 Node.js"
    echo "访问: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm,请先安装 npm"
    exit 1
fi

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3,请先安装 Python3"
    exit 1
fi

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行,正在安装 Node.js 依赖..."
    npm install
fi

# 检查 Python 依赖
if ! python3 -c "import flask" &> /dev/null; then
    echo "📦 正在安装 Python 依赖..."
    pip3 install -r backend/requirements.txt
fi

echo ""
echo "✅ 依赖检查完成"
echo "🎯 启动应用..."
echo ""

# 启动应用
npm start
