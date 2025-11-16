# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

CC万能启动器是一个基于 Python + Tkinter 的桌面应用,用于管理和启动分布在不同目录下的 Claude Code subagents 项目。

## 技术栈

- **语言**: Python 3.8+
- **GUI 框架**: Tkinter (Python 内置)
- **数据存储**: JSON
- **跨平台支持**: macOS, Linux, Windows

## 核心功能

1. **项目管理**
   - 添加项目:选择本地项目文件夹,设置名称、默认指令和查看结果路径
   - 修改项目:更新路径、名称、默认指令、查看结果路径
   - 删除项目:移除不需要的项目
   - 项目列表:树形视图展示所有项目

2. **项目执行**
   - 选择已添加的项目
   - 加载并编辑默认指令
   - 通过新终端自动跳转到项目路径并执行: `claude --dangerously-skip-permissions {指令}`

3. **结果查看**
   - 每个项目都有查看结果按钮,自动在文件管理器中打开对应文件夹

## 项目结构

```
CC万能启动器/
├── main.py                 # 主程序入口
├── run.sh                  # 启动脚本
├── requirements.txt        # 依赖说明
├── README.md              # 完整文档
├── 快速开始.md            # 快速上手指南
├── 需求.md                # 需求文档
├── src/                   # 源代码目录
│   ├── project_manager.py # 项目数据管理(JSON CRUD)
│   ├── command_executor.py# 跨平台命令执行
│   └── gui.py             # Tkinter 图形界面
└── data/                  # 数据目录
    └── projects.json      # 项目配置数据(自动生成)
```

## 核心模块

### project_manager.py
负责项目数据的增删改查,使用 JSON 文件持久化存储。

主要类和方法:
- `ProjectManager`: 项目管理器
  - `add_project()`: 添加新项目
  - `update_project()`: 更新项目信息
  - `delete_project()`: 删除项目
  - `get_project()`: 获取单个项目
  - `get_all_projects()`: 获取所有项目

### command_executor.py
负责跨平台终端命令执行和文件夹打开。

主要类和方法:
- `CommandExecutor`: 命令执行器
  - `execute_claude_command()`: 在新终端执行 Claude 命令
    - macOS: 使用 AppleScript + Terminal.app
    - Linux: 支持 gnome-terminal, xterm, konsole, xfce4-terminal
    - Windows: 使用 cmd.exe
  - `open_folder()`: 打开文件夹
    - macOS: `open`
    - Linux: `xdg-open`
    - Windows: `explorer`

### gui.py
基于 Tkinter 的图形用户界面。

主要类:
- `ProjectLauncherGUI`: 主界面类
  - 左侧: 项目列表(Treeview)
  - 右侧: 项目详情编辑区
  - 功能按钮: 添加、删除、启动、查看结果

## 启动应用

```bash
# 方法1: 使用启动脚本
./run.sh

# 方法2: 直接运行
python3 main.py
```

## 数据格式

项目数据存储在 `data/projects.json`:

```json
[
  {
    "id": "uuid",
    "name": "项目名称",
    "path": "/path/to/project",
    "default_command": "默认执行的指令",
    "result_path": "/path/to/results"
  }
]
```

## 项目框架

本项目使用 **BMad Method** 框架进行开发管理。BMad 是一个敏捷 AI 驱动的规划和开发方法。

### BMad 关键目录

```
.bmad-core/              # BMad 核心配置和资源
├── agents/              # BMad 代理定义
├── tasks/               # BMad 任务定义
├── templates/           # 文档模板
├── workflows/           # 工作流定义
├── checklists/          # 检查清单
├── data/                # 数据文件(包括 technical-preferences.md)
└── core-config.yaml     # 核心配置

.claude/commands/BMad/   # Claude Code 命令集成
├── agents/              # 可用代理
└── tasks/               # 可用任务

.spec-workflow/          # 规格工作流配置
```

### BMad 核心代理

通过 `.claude/commands/BMad/agents/` 访问以下代理:
- **BMad-Master**: 全能代理,可执行除故事实现外的所有任务
- **PM** (Product Manager): 创建和管理 PRD、用户故事
- **Architect**: 设计系统架构
- **SM** (Scrum Master): 管理故事草稿和开发流程
- **Dev**: 实现功能和测试
- **QA** (Test Architect): 质量保证、测试策略、风险评估
- **PO** (Product Owner): 文档验证和分片

### BMad 开发工作流

1. **规划阶段** (通常在 Web UI 中完成)
   - 分析师研究 → 项目简报 → PRD 创建 → 架构设计 → 文档分片

2. **开发阶段** (IDE 中)
   - SM 起草故事 → 可选 QA 风险评估 → Dev 实现 → 可选 QA 审查 → 提交

### QA 代理关键命令

```bash
@qa *risk {story}       # 开发前风险评估
@qa *design {story}     # 创建测试策略
@qa *trace {story}      # 验证测试覆盖率
@qa *nfr {story}        # 检查非功能性需求
@qa *review {story}     # 完整质量评估
@qa *gate {story}       # 更新质量门状态
```

### 质量门状态

- **PASS**: 所有关键需求已满足
- **CONCERNS**: 发现非关键问题
- **FAIL**: 存在应解决的关键问题
- **WAIVED**: 已确认但明确接受的问题

## BMad 方法安装和使用

```bash
# 安装 BMad Method (如需要)
npx bmad-method install

# 刷新 BMad 配置 (如果已配置)
npx bmad-method install -f
```

## 开发最佳实践

1. **上下文管理**: 仅保留相关文件在上下文中
2. **代理选择**: 为任务选择合适的代理
3. **迭代开发**: 进行小型、专注的任务
4. **定期提交**: 频繁保存工作成果

## 重要配置文件

- `.bmad-core/core-config.yaml` - BMad 核心配置
- `.bmad-core/data/technical-preferences.md` - 技术偏好设置
- 需求.md - 项目需求文档

## 文档路径约定

```
docs/prd.md              # 产品需求文档
docs/architecture.md     # 架构文档
docs/epics/              # 分片的史诗
docs/stories/            # 分片的故事
docs/qa/assessments/     # QA 评估
docs/qa/gates/           # 质量门
```

## 开发注意事项

- 使用 Python 3.8+ 内置的 Tkinter,无需额外安装依赖
- 所有用户数据存储在 `data/projects.json`,使用 UTF-8 编码
- 跨平台命令执行使用 `subprocess` 和 `platform` 模块
- GUI 采用左右分栏布局,左侧列表,右侧详情
- 项目使用 BMad Method 框架进行开发管理

## 常见开发任务

### 修改 GUI 布局
编辑 `src/gui.py` 中的 `_create_widgets()` 方法

### 添加新的存储字段
1. 修改 `src/project_manager.py` 中的数据模型
2. 更新 `src/gui.py` 中的界面显示

### 支持新的终端类型
在 `src/command_executor.py` 中添加新的平台检测和执行逻辑

### 调试
运行时错误会通过 `messagebox` 显示给用户,详细错误在控制台输出
