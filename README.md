# Claude Code 万能启动器

一个用于管理和启动分布在不同目录下的 Claude Code subagents 项目的图形化工具。

## 功能特性

### 1. 项目管理
- ✅ 添加项目:选择本地项目文件夹,设置名称、默认指令和结果路径
- ✅ 修改项目:更新项目的路径、名称、默认指令、结果路径
- ✅ 删除项目:移除不需要的项目
- ✅ 项目列表:清晰展示所有已添加的项目

### 2. 项目执行
- ✅ 选择项目后自动加载默认指令
- ✅ 可编辑指令内容(修改或补充)
- ✅ 点击"启动"按钮,自动在新终端中执行命令
- ✅ 命令格式:`cd {项目路径} && claude --dangerously-skip-permissions {指令}`

### 3. 结果查看
- ✅ 每个项目都有"查看结果"按钮
- ✅ 自动在 Finder/文件管理器中打开结果文件夹

## 系统要求

- Python 3.8 或更高版本
- Tkinter (Python 自带,通常无需额外安装)
- macOS / Linux / Windows

## 安装

本项目使用 Python 内置的 Tkinter 库,无需安装额外依赖。

1. 克隆或下载本项目到本地
2. 确保已安装 Python 3.8+

```bash
# 检查 Python 版本
python3 --version
```

## 使用方法

### 启动程序

#### 方法1: 使用启动脚本(推荐)
```bash
./run.sh
```

#### 方法2: 直接运行 Python
```bash
python3 main.py
```

### 添加项目

1. 点击左侧的"添加项目"按钮
2. 填写项目信息:
   - **项目名称**: 给项目起一个易识别的名字
   - **项目路径**: 点击"浏览"选择项目所在文件夹
   - **默认指令**: 输入要传递给 Claude Code 的默认指令
   - **结果路径**: 点击"浏览"选择查看结果的文件夹
3. 点击"添加"完成

### 修改项目

1. 在左侧项目列表中选择要修改的项目
2. 右侧会显示项目详情
3. 修改需要更改的字段
4. 点击"保存修改"

### 运行项目

1. 在左侧项目列表中选择项目
2. 右侧"执行指令"区域会自动加载默认指令
3. 可以编辑指令内容(补充或修改)
4. 点击"启动项目"按钮
5. 程序会在新终端窗口中自动:
   - 切换到项目目录
   - 执行 `claude --dangerously-skip-permissions {你的指令}`

### 查看结果

1. 选择项目后,点击"查看结果"按钮
2. 系统会自动在文件管理器中打开结果文件夹

### 删除项目

1. 选择要删除的项目
2. 点击"删除项目"按钮
3. 确认删除操作

## 项目结构

```
CC万能启动器/
├── main.py                 # 主程序入口
├── run.sh                  # 启动脚本
├── requirements.txt        # 依赖说明
├── README.md              # 使用文档
├── CLAUDE.md              # Claude Code 指导文档
├── 需求.md                # 需求文档
├── src/                   # 源代码目录
│   ├── project_manager.py # 项目管理模块
│   ├── command_executor.py# 命令执行模块
│   └── gui.py             # 图形界面模块
├── data/                  # 数据目录
│   └── projects.json      # 项目数据文件(自动生成)
├── .bmad-core/            # BMad Method 框架
├── .claude/               # Claude Code 配置
└── .spec-workflow/        # 规格工作流配置
```

## 数据存储

项目信息存储在 `data/projects.json` 文件中,格式如下:

```json
[
  {
    "id": "唯一标识符",
    "name": "项目名称",
    "path": "/path/to/project",
    "default_command": "默认指令内容",
    "result_path": "/path/to/results"
  }
]
```

## 跨平台支持

### macOS
- 使用 Terminal.app 打开新终端
- 使用 `open` 命令打开文件夹

### Linux
- 支持多种终端: gnome-terminal, xterm, konsole, xfce4-terminal
- 使用 `xdg-open` 打开文件夹

### Windows
- 使用 cmd.exe 打开新命令行窗口
- 使用 `explorer` 打开文件夹

## 常见问题

### Q: 启动项目后看不到终端窗口?
A: 检查终端应用是否被最小化,或者查看系统通知。

### Q: 提示"项目路径不存在"?
A: 确保选择的文件夹确实存在,并且你有访问权限。

### Q: 在 Linux 上提示"未找到可用的终端模拟器"?
A: 安装其中一个支持的终端: gnome-terminal, xterm, konsole 或 xfce4-terminal。

### Q: 如何备份项目配置?
A: 复制 `data/projects.json` 文件即可。

## 开发指南

### 模块说明

#### project_manager.py
负责项目数据的增删改查,使用 JSON 文件存储。

主要类:
- `ProjectManager`: 项目管理器

主要方法:
- `add_project()`: 添加项目
- `update_project()`: 更新项目
- `delete_project()`: 删除项目
- `get_project()`: 获取单个项目
- `get_all_projects()`: 获取所有项目

#### command_executor.py
负责在新终端中执行命令和打开文件夹。

主要类:
- `CommandExecutor`: 命令执行器

主要方法:
- `execute_claude_command()`: 执行 Claude Code 命令
- `open_folder()`: 打开文件夹

#### gui.py
基于 Tkinter 的图形用户界面。

主要类:
- `ProjectLauncherGUI`: 主界面类

## 技术栈

- **语言**: Python 3.8+
- **GUI 框架**: Tkinter
- **数据存储**: JSON
- **跨平台**: subprocess, platform

## 许可证

本项目使用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request!

## 更新日志

### v1.0.0 (2025-01-13)
- ✅ 实现项目管理功能(增删改查)
- ✅ 实现项目执行功能
- ✅ 实现结果查看功能
- ✅ 创建图形用户界面
- ✅ 支持 macOS/Linux/Windows 跨平台
- ✅ 完成项目文档

## 联系方式

如有问题或建议,欢迎通过 Issue 反馈。
