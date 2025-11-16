"""
图形用户界面模块 - 修复版
解决 macOS 旧版 Tkinter 的显示问题
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

        # 使用更大的初始窗口
        window_width = 1200
        window_height = 700

        # 获取屏幕尺寸并居中
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2

        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        self.root.configure(bg='#f0f0f0')  # 设置背景色

        # 强制更新窗口
        self.root.update()

        # 初始化项目管理器
        self.project_manager = ProjectManager()

        # 当前选中的项目
        self.selected_project = None

        # 实时保存标志和延迟保存定时器
        self._auto_save_pending = False
        self._auto_save_timer = None

        # 创建界面
        self._create_widgets()

        # 强制更新以显示组件
        self.root.update_idletasks()

        # 加载项目列表
        self.refresh_project_list()

    def _create_widgets(self):
        """创建界面组件"""
        # 使用 grid 布局而不是 pack
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=0)  # 左侧固定宽度
        self.root.grid_columnconfigure(1, weight=1)  # 右侧自适应

        # ========== 左侧面板 ==========
        left_frame = tk.Frame(self.root, bg='white', width=400, relief=tk.RAISED, bd=1)
        left_frame.grid(row=0, column=0, sticky='nsew', padx=(10, 5), pady=10)
        left_frame.grid_propagate(False)

        # 标题
        title_label = tk.Label(left_frame, text="项目列表",
                              font=('', 16, 'bold'),
                              bg='white', fg='#333')
        title_label.pack(pady=10)

        # 列表框架
        list_frame = tk.Frame(left_frame, bg='white')
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10)

        # 创建 Listbox 而不是 Treeview
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.project_listbox = tk.Listbox(list_frame,
                                         font=('', 12),
                                         yscrollcommand=scrollbar.set,
                                         selectmode=tk.SINGLE,
                                         bg='white',
                                         fg='#333',
                                         selectbackground='#0078d4',
                                         selectforeground='white',
                                         relief=tk.FLAT,
                                         bd=1)
        self.project_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.project_listbox.yview)

        # 绑定选择事件
        self.project_listbox.bind('<<ListboxSelect>>', self._on_project_select)

        # 存储项目ID的映射
        self.project_id_map = {}

        # 按钮区
        btn_frame = tk.Frame(left_frame, bg='white')
        btn_frame.pack(fill=tk.X, padx=10, pady=10)

        tk.Button(btn_frame, text="添加项目",
                 command=self._show_add_project_dialog,
                 bg='#0078d4', fg='white',
                 font=('', 11, 'bold'),
                 relief=tk.FLAT, bd=0,
                 padx=10, pady=5).pack(fill=tk.X, pady=2)

        tk.Button(btn_frame, text="删除项目",
                 command=self._delete_project,
                 bg='#d13438', fg='white',
                 font=('', 11),
                 relief=tk.FLAT, bd=0,
                 padx=10, pady=5).pack(fill=tk.X, pady=2)

        tk.Button(btn_frame, text="刷新列表",
                 command=self.refresh_project_list,
                 bg='#5c5c5c', fg='white',
                 font=('', 11),
                 relief=tk.FLAT, bd=0,
                 padx=10, pady=5).pack(fill=tk.X, pady=2)

        # ========== 右侧面板 ==========
        right_frame = tk.Frame(self.root, bg='white', relief=tk.RAISED, bd=1)
        right_frame.grid(row=0, column=1, sticky='nsew', padx=(5, 10), pady=10)

        # 使用 grid 布局
        right_frame.grid_rowconfigure(1, weight=0)
        right_frame.grid_rowconfigure(2, weight=1)
        right_frame.grid_columnconfigure(0, weight=1)

        # 标题
        detail_title = tk.Label(right_frame, text="项目详情",
                               font=('', 16, 'bold'),
                               bg='white', fg='#333')
        detail_title.grid(row=0, column=0, pady=10)

        # 基本信息框架
        info_frame = tk.LabelFrame(right_frame, text="基本信息",
                                  font=('', 12, 'bold'),
                                  bg='white', fg='#333',
                                  padx=15, pady=10)
        info_frame.grid(row=1, column=0, sticky='ew', padx=15, pady=(0, 10))

        # 项目名称
        tk.Label(info_frame, text="项目名称:", bg='white',
                font=('', 11)).grid(row=0, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        self.name_entry = tk.Entry(info_frame, textvariable=self.name_var,
                                   font=('', 11), width=40)
        self.name_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)

        # 项目路径
        tk.Label(info_frame, text="项目路径:", bg='white',
                font=('', 11)).grid(row=1, column=0, sticky=tk.W, pady=5)
        self.path_var = tk.StringVar()
        self.path_entry = tk.Entry(info_frame, textvariable=self.path_var,
                                   font=('', 11), width=40)
        self.path_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)
        tk.Button(info_frame, text="浏览...",
                 command=self._browse_project_path,
                 bg='#f0f0f0', relief=tk.FLAT).grid(row=1, column=2, padx=5)

        # 结果路径
        tk.Label(info_frame, text="结果路径:", bg='white',
                font=('', 11)).grid(row=2, column=0, sticky=tk.W, pady=5)
        self.result_path_var = tk.StringVar()
        self.result_path_entry = tk.Entry(info_frame, textvariable=self.result_path_var,
                                          font=('', 11), width=40)
        self.result_path_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)
        tk.Button(info_frame, text="浏览...",
                 command=self._browse_result_path,
                 bg='#f0f0f0', relief=tk.FLAT).grid(row=2, column=2, padx=5)

        # 保存按钮
        tk.Button(info_frame, text="保存修改",
                 command=self._save_project_changes,
                 bg='#107c10', fg='white',
                 font=('', 11, 'bold'),
                 relief=tk.FLAT, padx=20, pady=5).grid(row=3, column=0, columnspan=3, pady=10)

        info_frame.grid_columnconfigure(1, weight=1)

        # 执行指令框架
        cmd_frame = tk.LabelFrame(right_frame, text="命令列表",
                                 font=('', 12, 'bold'),
                                 bg='white', fg='#333',
                                 padx=15, pady=10)
        cmd_frame.grid(row=2, column=0, sticky='nsew', padx=15, pady=(0, 15))

        # 提示标签
        tk.Label(cmd_frame, text="每行一条命令,编辑后自动保存",
                bg='white', fg='#666',
                font=('', 10)).pack(anchor=tk.W, pady=(0, 5))

        # 命令列表显示区域
        commands_container = tk.Frame(cmd_frame, bg='white')
        commands_container.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        # 滚动条
        cmd_scrollbar = tk.Scrollbar(commands_container)
        cmd_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # 使用 Text widget 来显示和编辑多条命令
        self.commands_text = scrolledtext.ScrolledText(commands_container,
                                                       height=10,
                                                       wrap=tk.WORD,
                                                       font=('Courier', 11),
                                                       yscrollcommand=cmd_scrollbar.set)
        self.commands_text.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        cmd_scrollbar.config(command=self.commands_text.yview)

        # 绑定实时保存
        self.commands_text.bind('<KeyRelease>', self._on_commands_changed)

        # 执行按钮
        exec_frame = tk.Frame(cmd_frame, bg='white')
        exec_frame.pack(fill=tk.X, pady=(5, 0))

        tk.Button(exec_frame, text="▶ 执行",
                 command=self._execute_all_commands,
                 bg='#0078d4', fg='white',
                 font=('', 12, 'bold'),
                 relief=tk.FLAT, padx=20, pady=8).pack(side=tk.LEFT, padx=(0, 5))

        tk.Button(exec_frame, text="📂 查看结果",
                 command=self._open_result_folder,
                 bg='#5c5c5c', fg='white',
                 font=('', 11),
                 relief=tk.FLAT, padx=15, pady=8).pack(side=tk.LEFT, padx=5)

        # 初始状态
        self._set_detail_state('disabled')
        self._show_welcome_message()

    def _show_welcome_message(self):
        """显示欢迎信息"""
        projects = self.project_manager.get_all_projects()
        if len(projects) == 0:
            self.commands_text.config(state='normal')
            welcome = """欢迎使用 Claude Code 万能启动器!

快速开始:
1. 点击左侧 "添加项目" 按钮
2. 填写项目信息并保存
3. 在列表中选择项目
4. 编辑命令列表(每行一条命令)
5. 点击 "▶ 执行" 运行所有命令

提示:
• 命令列表: 每行一条命令
• 自动保存: 编辑后1秒自动保存
• 执行方式: 所有命令按顺序执行

需要帮助? 查看 README.md"""
            self.commands_text.delete('1.0', tk.END)
            self.commands_text.insert('1.0', welcome)
            self.commands_text.config(state='disabled')

    def _set_detail_state(self, state: str):
        """设置详情区域状态"""
        self.name_entry.config(state=state)
        self.path_entry.config(state=state)
        self.result_path_entry.config(state=state)
        self.commands_text.config(state=state)

    def refresh_project_list(self):
        """刷新项目列表"""
        # 清空列表
        self.project_listbox.delete(0, tk.END)
        self.project_id_map.clear()

        # 加载项目
        projects = self.project_manager.get_all_projects()
        for idx, project in enumerate(projects):
            self.project_listbox.insert(tk.END, f"  {project['name']}")
            self.project_id_map[idx] = project['id']

    def _on_project_select(self, event):
        """项目选择事件"""
        selection = self.project_listbox.curselection()
        if not selection:
            self._set_detail_state('disabled')
            self.selected_project = None
            return

        # 获取项目ID
        idx = selection[0]
        project_id = self.project_id_map.get(idx)

        if project_id:
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

        # 加载命令列表
        commands = project.get('commands', [])
        if not commands and project.get('default_command'):
            # 兼容旧版本:将单个命令转为列表
            commands = [project['default_command']]

        self.commands_text.delete('1.0', tk.END)
        if commands:
            # 每行显示一条命令
            self.commands_text.insert('1.0', '\n'.join(commands))

    def _show_add_project_dialog(self):
        """显示添加项目对话框"""
        dialog = tk.Toplevel(self.root)
        dialog.title("添加新项目")
        dialog.geometry("650x500")
        dialog.configure(bg='white')
        dialog.transient(self.root)
        dialog.grab_set()

        # 主框架
        main = tk.Frame(dialog, bg='white', padx=20, pady=20)
        main.pack(fill=tk.BOTH, expand=True)

        # 项目名称
        tk.Label(main, text="项目名称:", bg='white', font=('', 11, 'bold')).grid(
            row=0, column=0, sticky=tk.W, pady=5)
        name_var = tk.StringVar()
        tk.Entry(main, textvariable=name_var, width=50, font=('', 11)).grid(
            row=0, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5, padx=5)

        # 项目路径
        tk.Label(main, text="项目路径:", bg='white', font=('', 11, 'bold')).grid(
            row=1, column=0, sticky=tk.W, pady=5)
        path_var = tk.StringVar()
        tk.Entry(main, textvariable=path_var, width=50, font=('', 11)).grid(
            row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_path():
            folder = filedialog.askdirectory()
            if folder:
                path_var.set(folder)

        tk.Button(main, text="浏览...", command=browse_path,
                 bg='#f0f0f0', relief=tk.FLAT).grid(row=1, column=2, pady=5, padx=5)

        # 命令列表
        tk.Label(main, text="命令列表:", bg='white', font=('', 11, 'bold')).grid(
            row=2, column=0, sticky=tk.NW, pady=5)
        tk.Label(main, text="(每行一条命令)", bg='white', font=('', 9), fg='#666').grid(
            row=2, column=1, sticky=tk.W, pady=(0, 0), padx=5)
        command_text = scrolledtext.ScrolledText(main, height=10, width=50, font=('', 11))
        command_text.grid(row=2, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=(20, 5), padx=5)

        # 结果路径
        tk.Label(main, text="结果路径:", bg='white', font=('', 11, 'bold')).grid(
            row=3, column=0, sticky=tk.W, pady=5)
        result_var = tk.StringVar()
        tk.Entry(main, textvariable=result_var, width=50, font=('', 11)).grid(
            row=3, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)

        def browse_result():
            folder = filedialog.askdirectory()
            if folder:
                result_var.set(folder)

        tk.Button(main, text="浏览...", command=browse_result,
                 bg='#f0f0f0', relief=tk.FLAT).grid(row=3, column=2, pady=5, padx=5)

        # 按钮
        btn_frame = tk.Frame(main, bg='white')
        btn_frame.grid(row=4, column=0, columnspan=3, pady=20)

        def add_project():
            name = name_var.get().strip()
            path = path_var.get().strip()
            commands_text_content = command_text.get('1.0', tk.END).strip()
            result_path = result_var.get().strip()

            if not name:
                messagebox.showerror("错误", "请输入项目名称", parent=dialog)
                return
            if not path:
                messagebox.showerror("错误", "请选择项目路径", parent=dialog)
                return

            # 将文本内容按行分割为命令列表
            commands = [cmd.strip() for cmd in commands_text_content.split('\n') if cmd.strip()]

            try:
                # 使用命令列表
                self.project_manager.add_project(
                    name, path,
                    default_command=commands[0] if commands else '',  # 第一条作为默认命令(兼容)
                    result_path=result_path,
                    commands=commands
                )
                messagebox.showinfo("成功", "项目添加成功!", parent=dialog)
                self.refresh_project_list()
                dialog.destroy()
            except Exception as e:
                messagebox.showerror("错误", f"添加失败:\n{str(e)}", parent=dialog)

        tk.Button(btn_frame, text="添加", command=add_project,
                 bg='#0078d4', fg='white', font=('', 11, 'bold'),
                 relief=tk.FLAT, padx=20, pady=8).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="取消", command=dialog.destroy,
                 bg='#f0f0f0', font=('', 11),
                 relief=tk.FLAT, padx=20, pady=8).pack(side=tk.LEFT, padx=5)

        main.grid_columnconfigure(1, weight=1)

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
                self._show_welcome_message()
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
        commands_text_content = self.commands_text.get('1.0', tk.END).strip()

        if not name or not path:
            messagebox.showerror("错误", "项目名称和路径不能为空")
            return

        # 将文本内容按行分割为命令列表
        commands = [cmd.strip() for cmd in commands_text_content.split('\n') if cmd.strip()]

        try:
            self.project_manager.update_project(
                self.selected_project['id'],
                name=name, path=path,
                default_command=commands[0] if commands else '',  # 第一条作为默认命令(兼容)
                result_path=result_path,
                commands=commands
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


    def _on_commands_changed(self, event=None):
        """命令文本变化时的实时保存"""
        if not self.selected_project:
            return

        # 取消之前的定时器
        if self._auto_save_timer:
            self.root.after_cancel(self._auto_save_timer)

        # 设置新的定时器:1秒后保存
        self._auto_save_timer = self.root.after(1000, self._auto_save_commands)

    def _auto_save_commands(self):
        """自动保存命令(无提示)"""
        if not self.selected_project:
            return

        try:
            commands_text_content = self.commands_text.get('1.0', tk.END).strip()
            commands = [cmd.strip() for cmd in commands_text_content.split('\n') if cmd.strip()]

            self.project_manager.update_project(
                self.selected_project['id'],
                commands=commands,
                default_command=commands[0] if commands else ''
            )
            # 更新当前项目信息
            self.selected_project = self.project_manager.get_project(self.selected_project['id'])
        except Exception as e:
            # 静默失败,不打断用户
            print(f"自动保存失败: {e}")

    def _get_commands_list(self) -> list:
        """获取当前的命令列表"""
        commands_text_content = self.commands_text.get('1.0', tk.END).strip()
        return [cmd.strip() for cmd in commands_text_content.split('\n') if cmd.strip()]

    def _execute_all_commands(self):
        """执行所有命令"""
        if not self.selected_project:
            messagebox.showwarning("警告", "请先选择项目")
            return

        project_path = self.path_var.get().strip()
        commands = self._get_commands_list()

        if not commands:
            messagebox.showwarning("警告", "命令列表为空")
            return

        try:
            # 将所有命令合并为一个,用分号分隔
            combined_command = ' && '.join(commands)
            CommandExecutor.execute_claude_command(project_path, combined_command)
            messagebox.showinfo("成功", f"已在新终端窗口中启动 {len(commands)} 条命令!")
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

    # 强制刷新
    root.update()

    app = ProjectLauncherGUI(root)

    # 强制刷新
    root.update()

    root.mainloop()


if __name__ == '__main__':
    main()
