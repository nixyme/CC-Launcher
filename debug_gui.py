#!/usr/bin/env python3
"""
调试版本 - 简化的GUI用于测试
"""

import tkinter as tk
from tkinter import ttk

def test_basic_window():
    """测试基本窗口"""
    root = tk.Tk()
    root.title("测试窗口")
    root.geometry("800x600")

    # 添加一个简单的标签
    label = tk.Label(root, text="如果你能看到这个文字,说明 Tkinter 工作正常",
                    font=('', 16), fg='blue')
    label.pack(pady=20)

    # 添加按钮
    button = tk.Button(root, text="点击测试",
                      command=lambda: label.config(text="按钮工作正常!"))
    button.pack(pady=10)

    root.mainloop()

if __name__ == '__main__':
    print("启动基本测试窗口...")
    test_basic_window()
