"""
图形用户界面模块 V2
使用更简单可靠的布局方式
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
from typing import Optional
from project_manager import ProjectManager
from command_executor import CommandExecutor


class ProjectLauncherGUI:
    """项目启动器图形界面"""

    def __init__(self, root: tk.Tk):
        """初始化GUI"""
        self.root = root
        self.root.title("Claude Code 万能启动器")
        self.root.geometry("1200x700")

        # 初始化项目管理器
        self.project_manager = ProjectManager()

        # 当前选中的项目
        self.selected_project = None

        # 创建界面
        self._create_widgets()

        # 加载项目列表
        self.refresh_project_list()

    def _create_widgets(self):
        """创建界面组件"""
        # 主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # 左右分栏
        left_frame = ttk.Frame(main_frame, width=400)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=False, padx=(0, 10))
        left_frame.pack_propagate(False)  # 固定宽度

        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # ========== 左侧:项目列表 ==========
        # 标题
        title_label = ttk.Label(left_frame, text="项目列表",
                               font=('', 14, 'bold'))
        title_label.pack(pady=(0, 10))

        # 列表容器
        list_container = ttk.Frame(left_frame)
        list_container.pack(fill=tk.BOTH, expand=True)

        # Treeview
        self.project_tree = ttk.Treeview(list_container,
                                        columns=('name',),
                                        show='tree headings',
                                        selectmode='browse')
        self.project_tree.heading('#0', text='项目')
        self.project_tree.heading('name', text='名称')
        self.project_tree.column('#0', width=0, stretch=False)  # 隐藏树形列
        self.project_tree.column('name', width=380)

        # 滚动条
        scrollbar = ttk.Scrollbar(list_container, orient=tk.VERTICAL,
                                 command=self.project_tree.yview)
        self.project_tree.configure(yscrollcommand=scrollbar.set)

        self.project_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # 绑定选择事件
        self.project_tree.bind('<<TreeviewSelect>>', self._on_project_select)

        # 按钮区
        btn_frame = ttk.Frame(left_frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Button(btn_frame, text="➕ 添加项目",
                  command=self._show_add_project_dialog).pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame, text="🗑️ 删除项目",
                  command=self._delete_project).pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame, text="🔄 刷新列表",
                  command=self.refresh_project_list).pack(fill=tk.X, pady=2)

        # ========== 右侧:项目详情 ==========
        # 标题
        detail_title = ttk.Label(right_frame, text="项目详情",
                                font=('', 14, 'bold'))
        detail_title.pack(pady=(0, 10))

        # 基本信息
        info_frame = ttk.LabelFrame(right_frame, text="基本信息", padding=10)
        info_frame.pack(fill=tk.X, pady=(0, 10))

        # 项目名称
        name_row = ttk.Frame(info_frame)
        name_row.pack(fill=tk.X, pady=5)
        ttk.Label(name_row, text="项目名称:", width=10).pack(side=tk.LEFT)
        self.name_var = tk.StringVar()
        self.name_entry = ttk.Entry(name_row, textvariable=self.name_var)
        self.name_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        # 项目路径
        path_row = ttk.Frame(info_frame)
        path_row.pack(fill=tk.X, pady=5)
        ttk.Label(path_row, text="项目路径:", width=10).pack(side=tk.LEFT)
        self.path_var = tk.StringVar()
        self.path_entry = ttk.Entry(path_row, textvariable=self.path_var)
        self.path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(path_row, text="浏览...",
                  command=self._browse_project_path).pack(side=tk.LEFT)

        # 结果路径
        result_row = ttk.Frame(info_frame)
        result_row.pack(fill=tk.X, pady=5)
        ttk.Label(result_row, text="结果路径:", width=10).pack(side=tk.LEFT)
        self.result_path_var = tk.StringVar()
        self.result_path_entry = ttk.Entry(result_row, textvariable=self.result_path_var)
        self.result_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(result_row, text="浏览...",
                  command=self._browse_result_path).pack(side=tk.LEFT)

        # 保存按钮
        ttk.Button(info_frame, text="💾 保存修改",
                  command=self._save_project_changes).pack(pady=(10, 0))

        # 执行指令区
        cmd_frame = ttk.LabelFrame(right_frame, text="执行指令", padding=10)
        cmd_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(cmd_frame, text="默认指令:").pack(anchor=tk.W)

        self.command_text = scrolledtext.ScrolledText(cmd_frame, height=10, wrap=tk.WORD)
        self.command_text.pack(fill=tk.BOTH, expand=True, pady=(5, 10))

        # 执行按钮
        exec_btn_frame = ttk.Frame(cmd_frame)
        exec_btn_frame.pack(fill=tk.X)

        ttk.Button(exec_btn_frame, text="🚀 启动项目",
                  command=self._execute_project).pack(side=tk.LEFT, padx=5)
        ttk.Button(exec_btn_frame, text="📂 查看结果",
                  command=self._open_result_folder).pack(side=tk.LEFT, padx=5)
        ttk.Button(exec_btn_frame, text="🔄 重置指令",
                  command=self._reset_command).pack(side=tk.LEFT, padx=5)

        # 初始状态
        self._set_detail_state('disabled')
        self._show_welcome_message()

    def _show_welcome_message(self):
        """显示欢迎信息"""
        projects = self.project_manager.get_all_projects()
        if len(projects) == 0:
            self.command_text.config(state='normal')
            welcome = """🎉 欢迎使用 Claude Code 万能启动器!

📝 快速开始:
1. 点击左侧 "➕ 添加项目" 按钮
2. 填写项目信息并保存
3. 在列表中选择项目
4. 点击 "🚀 启动项目" 开始工作

💡 提示:
• 项目路径: 你的 Claude Code 项目文件夹
• 默认指令: 告诉 Claude 要做什么
• 结果路径: 查看输出结果的文件夹

📖 需要帮助? 查看 快速开始.md
"""
            self.command_text.delete('1.0', tk.END)
            self.command_text.insert('1.0', welcome)
            self.command_text.config(state='disabled')

    def _set_detail_state(self, state: str):
        """设置详情区域状态"""
        self.name_entry.config(state=state)
        self.path_entry.config(state=state)
        self.result_path_entry.config(state=state)
        self.command_text.config(state=state)

    def refresh_project_list(self):
        """刷新项目列表"""
        # 清空列表
        for item in self.project_tree.get_children():
            self.project_tree.delete(item)

        # 加载项目
        projects = self.project_manager.get_all_projects()
        for project in projects:
            # 使用 iid 存储项目ID
            self.project_tree.insert('', tk.END,
                                    iid=project['id'],
                                    values=(project['name'],))

    def _on_project_select(self, event):
        """项目选择事件"""
        selection = self.project_tree.selection()
        if not selection:
            self._set_detail_state('disabled')
            self.selected_project = None
            return

        # 获取项目ID
        project_id = selection[0]
        project = self.project_manager.get_project(project_id)

        if project:
            self.selected_project = project
            self._load_project_details(project)
            self._set_detail_state('normal')

    def _load_project_details(self, project: dict):
        """加载项目详情"""
        self.name_var.set(project['name'])
        self.path_var.set(project['path'])
        self.result_path_var.set(project.get('result_path', ''))

        self.command_text.delete('1.0', tk.END)
        self.command_text.insert('1.0', project.get('default_command', ''))

    def _show_add_project_dialog(self):
        """显示添加项目对话框"""
        dialog = tk.Toplevel(self.root)
        dialog.title("添加新项目")
        dialog.geometry("600x450")
        dialog.transient(self.root)
        dialog.grab_set()

        # 主框架
        main = ttk.Frame(dialog, padding=20)
        main.pack(fill=tk.BOTH, expand=True)

        # 项目名称
        ttk.Label(main, text="项目名称:").grid(row=0, column=0, sticky=tk.W, pady=5)
        name_var = tk.StringVar()
        ttk.Entry(main, textvariable=name_var, width=50).grid(
            row=0, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5, padx=5)

        # 项目路径
        ttk.Label(main, text="项目路径:").grid(row=1, column=0, sticky=tk.W, pady=5)
        path_var = tk.StringVar()
        ttk.Entry(main, textvariable=path_var, width=50).grid(
            row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_path():
            folder = filedialog.askdirectory()
            if folder:
                path_var.set(folder)

        ttk.Button(main, text="浏览...", command=browse_path).grid(
            row=1, column=2, pady=5, padx=5)

        # 默认指令
        ttk.Label(main, text="默认指令:").grid(row=2, column=0, sticky=tk.NW, pady=5)
        command_text = scrolledtext.ScrolledText(main, height=8, width=50)
        command_text.grid(row=2, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5, padx=5)

        # 结果路径
        ttk.Label(main, text="结果路径:").grid(row=3, column=0, sticky=tk.W, pady=5)
        result_var = tk.StringVar()
        ttk.Entry(main, textvariable=result_var, width=50).grid(
            row=3, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_result():
            folder = filedialog.askdirectory()
            if folder:
                result_var.set(folder)

        ttk.Button(main, text="浏览...", command=browse_result).grid(
            row=3, column=2, pady=5, padx=5)

        # 按钮
        btn_frame = ttk.Frame(main)
        btn_frame.grid(row=4, column=0, columnspan=3, pady=20)

        def add_project():
            name = name_var.get().strip()
            path = path_var.get().strip()
            command = command_text.get('1.0', tk.END).strip()
            result_path = result_var.get().strip()

            if not name:
                messagebox.showerror("错误", "请输入项目名称", parent=dialog)
                return
            if not path:
                messagebox.showerror("错误", "请选择项目路径", parent=dialog)
                return

            try:
                self.project_manager.add_project(name, path, command, result_path)
                messagebox.showinfo("成功", "项目添加成功!", parent=dialog)
                self.refresh_project_list()
                dialog.destroy()
            except Exception as e:
                messagebox.showerror("错误", f"添加失败:\n{str(e)}", parent=dialog)

        ttk.Button(btn_frame, text="添加", command=add_project).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=5)

        main.columnconfigure(1, weight=1)

    def _delete_project(self):
        """删除项目"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择要删除的项目")
            return

        result = messagebox.askyesno("确认删除",
                                    f"确定要删除项目 '{self.selected_project['name']}' 吗?")
        if result:
            try:
                self.project_manager.delete_project(self.selected_project['id'])
                messagebox.showinfo("成功", "项目删除成功!")
                self.selected_project = None
                self.refresh_project_list()
                self._set_detail_state('disabled')
            except Exception as e:
                messagebox.showerror("错误", f"删除失败:\n{str(e)}")

    def _save_project_changes(self):
        """保存项目修改"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        name = self.name_var.get().strip()
        path = self.path_var.get().strip()
        result_path = self.result_path_var.get().strip()
        command = self.command_text.get('1.0', tk.END).strip()

        if not name or not path:
            messagebox.showerror("错误", "项目名称和路径不能为空")
            return

        try:
            self.project_manager.update_project(
                self.selected_project['id'],
                name=name, path=path,
                default_command=command,
                result_path=result_path
            )
            messagebox.showinfo("成功", "项目信息已更新!")
            self.refresh_project_list()
        except Exception as e:
            messagebox.showerror("错误", f"保存失败:\n{str(e)}")

    def _browse_project_path(self):
        """浏览项目路径"""
        folder = filedialog.askdirectory()
        if folder:
            self.path_var.set(folder)

    def _browse_result_path(self):
        """浏览结果路径"""
        folder = filedialog.askdirectory()
        if folder:
            self.result_path_var.set(folder)

    def _reset_command(self):
        """重置指令"""
        if not self.selected_project:
            return
        self.command_text.delete('1.0', tk.END)
        self.command_text.insert('1.0', self.selected_project.get('default_command', ''))

    def _execute_project(self):
        """执行项目"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        project_path = self.path_var.get().strip()
        command = self.command_text.get('1.0', tk.END).strip()

        if not command:
            messagebox.showwarning("警告", "请输入要执行的指令")
            return

        try:
            CommandExecutor.execute_claude_command(project_path, command)
            messagebox.showinfo("成功", "已在新终端窗口中启动项目!")
        except Exception as e:
            messagebox.showerror("错误", f"启动失败:\n{str(e)}")

    def _open_result_folder(self):
        """打开结果文件夹"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        result_path = self.result_path_var.get().strip()
        if not result_path:
            messagebox.showwarning("警告", "未设置结果路径")
            return

        try:
            CommandExecutor.open_folder(result_path)
        except Exception as e:
            messagebox.showerror("错误", f"打开失败:\n{str(e)}")


def main():
    """主函数"""
    root = tk.Tk()
    app = ProjectLauncherGUI(root)
    root.mainloop()


if __name__ == '__main__':
    main()
