"""
命令执行模块
负责在新终端中执行 Claude Code 命令
"""

import subprocess
import os
import platform


class CommandExecutor:
    """命令执行器类"""

    @staticmethod
    def execute_claude_command(project_path: str, command: str):
        """
        在新终端窗口中执行 claude 命令

        Args:
            project_path: 项目路径
            command: 要执行的命令内容
        """
        # 获取操作系统类型
        system = platform.system()

        # 构建完整的 claude 命令
        # 使用 --dangerously-skip-permissions 跳过权限确认
        full_command = f'claude --dangerously-skip-permissions "{command}"'

        if system == "Darwin":  # macOS
            CommandExecutor._execute_on_macos(project_path, full_command)
        elif system == "Linux":
            CommandExecutor._execute_on_linux(project_path, full_command)
        elif system == "Windows":
            CommandExecutor._execute_on_windows(project_path, full_command)
        else:
            raise OSError(f"不支持的操作系统: {system}")

    @staticmethod
    def _execute_on_macos(project_path: str, command: str):
        """
        在 macOS 上执行命令

        Args:
            project_path: 项目路径
            command: 完整命令
        """
        # 使用 osascript 打开新的 Terminal 窗口并执行命令
        # 转义命令中的特殊字符
        escaped_command = command.replace('"', '\\"').replace('$', '\\$')
        escaped_path = project_path.replace('"', '\\"')

        apple_script = f'''
        tell application "Terminal"
            activate
            do script "cd \\"{escaped_path}\\" && {escaped_command}"
        end tell
        '''

        try:
            subprocess.run(['osascript', '-e', apple_script], check=True)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"执行命令失败: {e}")

    @staticmethod
    def _execute_on_linux(project_path: str, command: str):
        """
        在 Linux 上执行命令

        Args:
            project_path: 项目路径
            command: 完整命令
        """
        # 尝试常见的终端模拟器
        terminals = [
            ('gnome-terminal', ['--', 'bash', '-c']),
            ('xterm', ['-e', 'bash', '-c']),
            ('konsole', ['-e', 'bash', '-c']),
            ('xfce4-terminal', ['-e', 'bash', '-c'])
        ]

        full_command = f'cd "{project_path}" && {command}; exec bash'

        for terminal, args in terminals:
            try:
                # 检查终端是否可用
                subprocess.run(['which', terminal],
                             stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL,
                             check=True)

                # 执行命令
                subprocess.Popen([terminal] + args + [full_command])
                return
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        raise RuntimeError("未找到可用的终端模拟器")

    @staticmethod
    def _execute_on_windows(project_path: str, command: str):
        """
        在 Windows 上执行命令

        Args:
            project_path: 项目路径
            command: 完整命令
        """
        # 使用 cmd.exe 打开新窗口
        # /k 参数让窗口保持打开
        full_command = f'cd /d "{project_path}" && {command}'

        try:
            subprocess.Popen(['cmd', '/k', full_command],
                           creationflags=subprocess.CREATE_NEW_CONSOLE)
        except Exception as e:
            raise RuntimeError(f"执行命令失败: {e}")

    @staticmethod
    def open_folder(folder_path: str):
        """
        使用系统默认文件管理器打开文件夹

        Args:
            folder_path: 文件夹路径
        """
        if not os.path.exists(folder_path):
            raise ValueError(f"文件夹不存在: {folder_path}")

        system = platform.system()

        try:
            if system == "Darwin":  # macOS
                subprocess.run(['open', folder_path], check=True)
            elif system == "Linux":
                subprocess.run(['xdg-open', folder_path], check=True)
            elif system == "Windows":
                subprocess.run(['explorer', folder_path], check=True)
            else:
                raise OSError(f"不支持的操作系统: {system}")
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"打开文件夹失败: {e}")
