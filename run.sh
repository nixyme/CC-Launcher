#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" && cd "$SCRIPT_DIR"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
  echo "首次运行，安装依赖..."
  npm install
fi

# 启动
npm start
