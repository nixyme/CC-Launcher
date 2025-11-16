"""
图形用户界面模块
基于 Tkinter 的项目管理界面
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
from typing import Optional
from project_manager import ProjectManager
from command_executor import CommandExecutor


class ProjectLauncherGUI:
    """项目启动器图形界面"""

    def __init__(self, root: tk.Tk):
        """
        初始化GUI

        Args:
            root: Tkinter 根窗口
        """
        self.root = root
        self.root.title("Claude Code 万能启动器")
        self.root.geometry("1000x700")

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
        # 主容器 - 使用PanedWindow分割左右
        main_paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # 左侧面板 - 项目列表
        left_frame = ttk.Frame(main_paned)
        main_paned.add(left_frame, weight=1)

        # 项目列表标题
        ttk.Label(left_frame, text="项目列表", font=('', 14, 'bold')).pack(pady=5)

        # 项目列表框架
        list_frame = ttk.Frame(left_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        # 创建Treeview - 使用3列,id列设置为隐藏
        columns = ('name', 'path', 'id')
        self.project_tree = ttk.Treeview(list_frame, columns=columns,
                                         show='headings', selectmode='browse')

        self.project_tree.heading('name', text='项目名称')
        self.project_tree.heading('path', text='项目路径')
        self.project_tree.heading('id', text='ID')  # 隐藏列

        self.project_tree.column('name', width=150, minwidth=100)
        self.project_tree.column('path', width=300, minwidth=200)
        self.project_tree.column('id', width=0, stretch=False)  # 宽度设为0,隐藏

        # 添加滚动条
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL,
                                 command=self.project_tree.yview)
        self.project_tree.configure(yscrollcommand=scrollbar.set)

        self.project_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # 绑定选择事件
        self.project_tree.bind('<<TreeviewSelect>>', self._on_project_select)

        # 左侧按钮区
        left_btn_frame = ttk.Frame(left_frame)
        left_btn_frame.pack(fill=tk.X, pady=10)

        ttk.Button(left_btn_frame, text="添加项目",
                  command=self._show_add_project_dialog).pack(side=tk.LEFT, padx=5)
        ttk.Button(left_btn_frame, text="删除项目",
                  command=self._delete_project).pack(side=tk.LEFT, padx=5)
        ttk.Button(left_btn_frame, text="刷新列表",
                  command=self.refresh_project_list).pack(side=tk.LEFT, padx=5)

        # 右侧面板 - 项目详情和操作
        right_frame = ttk.Frame(main_paned)
        main_paned.add(right_frame, weight=2)

        # 项目详情标题
        ttk.Label(right_frame, text="项目详情", font=('', 14, 'bold')).pack(pady=5)

        # 详情表单
        details_frame = ttk.LabelFrame(right_frame, text="基本信息", padding=10)
        details_frame.pack(fill=tk.X, padx=5, pady=5)

        # 项目名称
        name_frame = ttk.Frame(details_frame)
        name_frame.pack(fill=tk.X, pady=5)
        ttk.Label(name_frame, text="项目名称:", width=12).pack(side=tk.LEFT)
        self.name_var = tk.StringVar()
        self.name_entry = ttk.Entry(name_frame, textvariable=self.name_var)
        self.name_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        # 项目路径
        path_frame = ttk.Frame(details_frame)
        path_frame.pack(fill=tk.X, pady=5)
        ttk.Label(path_frame, text="项目路径:", width=12).pack(side=tk.LEFT)
        self.path_var = tk.StringVar()
        self.path_entry = ttk.Entry(path_frame, textvariable=self.path_var)
        self.path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(path_frame, text="浏览...",
                  command=self._browse_project_path).pack(side=tk.LEFT)

        # 查看结果路径
        result_frame = ttk.Frame(details_frame)
        result_frame.pack(fill=tk.X, pady=5)
        ttk.Label(result_frame, text="结果路径:", width=12).pack(side=tk.LEFT)
        self.result_path_var = tk.StringVar()
        self.result_path_entry = ttk.Entry(result_frame,
                                           textvariable=self.result_path_var)
        self.result_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(result_frame, text="浏览...",
                  command=self._browse_result_path).pack(side=tk.LEFT)

        # 保存修改按钮
        ttk.Button(details_frame, text="保存修改",
                  command=self._save_project_changes).pack(pady=10)

        # 默认指令和执行区域
        command_frame = ttk.LabelFrame(right_frame, text="执行指令", padding=10)
        command_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        ttk.Label(command_frame, text="默认指令:").pack(anchor=tk.W)
        self.default_command_text = scrolledtext.ScrolledText(
            command_frame, height=8, wrap=tk.WORD)
        self.default_command_text.pack(fill=tk.BOTH, expand=True, pady=5)

        # 执行按钮区
        execute_btn_frame = ttk.Frame(command_frame)
        execute_btn_frame.pack(fill=tk.X, pady=5)

        ttk.Button(execute_btn_frame, text="启动项目",
                  command=self._execute_project,
                  style='Accent.TButton').pack(side=tk.LEFT, padx=5)
        ttk.Button(execute_btn_frame, text="查看结果",
                  command=self._open_result_folder).pack(side=tk.LEFT, padx=5)
        ttk.Button(execute_btn_frame, text="重置为默认指令",
                  command=self._reset_command).pack(side=tk.LEFT, padx=5)

        # 设置初始状态为禁用
        self._set_detail_state('disabled')

        # 显示欢迎信息
        self._show_welcome_message()

    def _show_welcome_message(self):
        """显示欢迎信息"""
        projects = self.project_manager.get_all_projects()
        if len(projects) == 0:
            # 在指令文本框显示欢迎信息
            self.default_command_text.config(state='normal')
            welcome_text = """欢迎使用 Claude Code 万能启动器! 🎉

开始使用:
1. 点击左侧 "添加项目" 按钮
2. 填写项目信息(名称、路径、默认指令等)
3. 选择项目后即可启动

提示:
- 项目路径: 选择你的 Claude Code 项目所在文件夹
- 默认指令: 输入你想让 Claude 执行的任务
- 结果路径: 选择查看结果的文件夹

需要帮助? 查看项目根目录下的 快速开始.md 文件
"""
            self.default_command_text.delete('1.0', tk.END)
            self.default_command_text.insert('1.0', welcome_text)
            self.default_command_text.config(state='disabled')

    def _set_detail_state(self, state: str):
        """
        设置详情区域的状态

        Args:
            state: 'normal' 或 'disabled'
        """
        self.name_entry.config(state=state)
        self.path_entry.config(state=state)
        self.result_path_entry.config(state=state)
        self.default_command_text.config(state=state)

    def _on_project_select(self, event):
        """项目选择事件处理"""
        selection = self.project_tree.selection()
        if not selection:
            self._set_detail_state('disabled')
            self.selected_project = None
            return

        # 获取选中项目的ID
        item = selection[0]
        project_id = self.project_tree.item(item, 'values')[2]  # 隐藏的ID列

        # 加载项目详情
        project = self.project_manager.get_project(project_id)
        if project:
            self.selected_project = project
            self._load_project_details(project)
            self._set_detail_state('normal')

    def _load_project_details(self, project: dict):
        """
        加载项目详情到界面

        Args:
            project: 项目信息字典
        """
        self.name_var.set(project['name'])
        self.path_var.set(project['path'])
        self.result_path_var.set(project.get('result_path', ''))

        self.default_command_text.delete('1.0', tk.END)
        self.default_command_text.insert('1.0', project.get('default_command', ''))

    def refresh_project_list(self):
        """刷新项目列表"""
        # 清空现有项目
        for item in self.project_tree.get_children():
            self.project_tree.delete(item)

        # 加载所有项目
        projects = self.project_manager.get_all_projects()
        for project in projects:
            # 添加到树形视图,将ID作为隐藏值
            self.project_tree.insert('', tk.END,
                                    values=(project['name'],
                                           project['path'],
                                           project['id']))

    def _show_add_project_dialog(self):
        """显示添加项目对话框"""
        dialog = tk.Toplevel(self.root)
        dialog.title("添加新项目")
        dialog.geometry("600x400")
        dialog.transient(self.root)
        dialog.grab_set()

        # 表单
        form_frame = ttk.Frame(dialog, padding=20)
        form_frame.pack(fill=tk.BOTH, expand=True)

        # 项目名称
        ttk.Label(form_frame, text="项目名称:").grid(row=0, column=0, sticky=tk.W, pady=5)
        name_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=name_var, width=50).grid(
            row=0, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        # 项目路径
        ttk.Label(form_frame, text="项目路径:").grid(row=1, column=0, sticky=tk.W, pady=5)
        path_var = tk.StringVar()
        path_entry = ttk.Entry(form_frame, textvariable=path_var, width=50)
        path_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_path():
            folder = filedialog.askdirectory()
            if folder:
                path_var.set(folder)

        ttk.Button(form_frame, text="浏览...", command=browse_path).grid(
            row=1, column=2, pady=5, padx=5)

        # 默认指令
        ttk.Label(form_frame, text="默认指令:").grid(row=2, column=0, sticky=tk.NW, pady=5)
        command_text = scrolledtext.ScrolledText(form_frame, height=6, width=50)
        command_text.grid(row=2, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5, padx=5)

        # 结果路径
        ttk.Label(form_frame, text="结果路径:").grid(row=3, column=0, sticky=tk.W, pady=5)
        result_var = tk.StringVar()
        result_entry = ttk.Entry(form_frame, textvariable=result_var, width=50)
        result_entry.grid(row=3, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_result():
            folder = filedialog.askdirectory()
            if folder:
                result_var.set(folder)

        ttk.Button(form_frame, text="浏览...", command=browse_result).grid(
            row=3, column=2, pady=5, padx=5)

        # 按钮
        btn_frame = ttk.Frame(form_frame)
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
                messagebox.showerror("错误", f"添加项目失败:\n{str(e)}", parent=dialog)

        ttk.Button(btn_frame, text="添加", command=add_project).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=5)

        form_frame.columnconfigure(1, weight=1)

    def _delete_project(self):
        """删除选中的项目"""
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
                messagebox.showerror("错误", f"删除项目失败:\n{str(e)}")

    def _save_project_changes(self):
        """保存项目修改"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        name = self.name_var.get().strip()
        path = self.path_var.get().strip()
        result_path = self.result_path_var.get().strip()
        command = self.default_command_text.get('1.0', tk.END).strip()

        if not name or not path:
            messagebox.showerror("错误", "项目名称和路径不能为空")
            return

        try:
            self.project_manager.update_project(
                self.selected_project['id'],
                name=name,
                path=path,
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
        """重置为默认指令"""
        if not self.selected_project:
            return

        self.default_command_text.delete('1.0', tk.END)
        self.default_command_text.insert('1.0',
                                        self.selected_project.get('default_command', ''))

    def _execute_project(self):
        """执行项目"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        project_path = self.path_var.get().strip()
        command = self.default_command_text.get('1.0', tk.END).strip()

        if not command:
            messagebox.showwarning("警告", "请输入要执行的指令")
            return

        try:
            CommandExecutor.execute_claude_command(project_path, command)
            messagebox.showinfo("成功", "已在新终端窗口中启动项目!")
        except Exception as e:
            messagebox.showerror("错误", f"启动项目失败:\n{str(e)}")

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
            messagebox.showerror("错误", f"打开文件夹失败:\n{str(e)}")


def main():
    """主函数"""
    root = tk.Tk()
    app = ProjectLauncherGUI(root)
    root.mainloop()


if __name__ == '__main__':
    main()
