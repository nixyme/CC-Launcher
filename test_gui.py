#!/usr/bin/env python3
"""
GUI 快速测试脚本
用于验证界面是否正常显示
"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

if __name__ == '__main__':
    print("启动 Claude Code 万能启动器...")
    print("如果看到窗口,说明界面加载成功!")
    print("修复内容:")
    print("1. ✅ 修复了 Treeview 列配置问题")
    print("2. ✅ 添加了隐藏的 ID 列")
    print("3. ✅ 添加了欢迎信息提示")
    print("\n正在启动...")

    from gui import main
    main()
