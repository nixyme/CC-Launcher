#!/usr/bin/env python3
"""
最小化测试 - 验证 Tkinter 基本功能
"""

import tkinter as tk
import sys

print(f"Python version: {sys.version}")
print(f"Tkinter version: {tk.TkVersion}")

# 创建最简单的窗口
root = tk.Tk()
root.title("测试")
root.geometry("400x300")

# 设置背景色以便看到窗口
root.configure(bg='white')

# 添加标签
label = tk.Label(root, text="这是测试文字",
                font=('Arial', 20),
                bg='white',
                fg='red')
label.place(x=50, y=50)  # 使用 place 而不是 pack

# 添加按钮
button = tk.Button(root, text="点击测试",
                  font=('Arial', 14),
                  command=lambda: print("按钮被点击了!"))
button.place(x=50, y=100)

print("窗口已创建,应该可以看到红色文字和按钮")
print("如果看不到,可能是 macOS Tkinter 的问题")

root.mainloop()
