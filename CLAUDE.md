# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

CC万能启动器是一个基于 Electron + Python Flask 的桌面应用,用于管理和启动分布在不同目录下的 Claude Code subagents 项目。

## 技术栈

- **前端**: Electron + HTML/CSS/JavaScript
- **后端**: Python Flask
- **数据存储**: JSON
- **跨平台支持**: macOS, Linux, Windows

## 核心功能

1. **项目管理**
   - 添加项目:选择本地项目文件夹,设置名称、默认指令和查看结果路径
   - 修改项目:更新路径、名称、默认指令、查看结果路径
   - 删除项目:移除不需要的项目
   - 项目列表:展示所有项目

2. **项目执行**
   - 选择已添加的项目
   - 加载并编辑默认指令
   - 通过新终端自动跳转到项目路径并执行: `claude --dangerously-skip-permissions {指令}`

3. **结果查看**
   - 每个项目都有查看结果按钮,自动在文件管理器中打开对应文件夹

## 项目结构

```
CC万能启动器/
├── electron/              # Electron 前端
│   ├── main.js           # Electron 主进程
│   ├── preload.js        # 预加载脚本
│   └── renderer/         # 渲染进程（HTML/CSS/JS）
├── backend/              # Python Flask 后端
│   ├── server.py         # Flask API 服务器
│   └── requirements.txt  # Python 依赖
├── build/                # 构建资源（图标等）
├── data/                 # 数据目录
│   └── projects.json     # 项目配置数据
├── package.json          # Node.js 配置
├── start.sh              # 启动脚本
├── README_ELECTRON.md    # Electron 版本文档
└── 快速开始_ELECTRON.md  # 快速上手指南
```

## 核心模块

### backend/server.py
Flask RESTful API 服务器,负责:
- 项目数据的 CRUD 操作
- 命令执行（通过终端）
- 文件夹打开

主要 API:
- `GET /projects`: 获取所有项目
- `POST /projects`: 添加新项目
- `PUT /projects/<id>`: 更新项目
- `DELETE /projects/<id>`: 删除项目
- `POST /execute`: 执行命令
- `POST /open-folder`: 打开文件夹

### electron/main.js
Electron 主进程,负责:
- 创建应用窗口
- 管理应用生命周期
- IPC 通信

### electron/renderer/
渲染进程,包含:
- HTML 界面布局
- CSS 样式
- JavaScript 交互逻辑

## 启动应用

```bash
# 方法1: 使用 npm
npm run dev

# 方法2: 使用启动脚本
./start.sh
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
    "result_path": "/path/to/results",
    "commands": ["命令1", "命令2"]
  }
]
```

## 开发注意事项

- 后端运行在 `http://localhost:5283`
- 前端通过 axios 与后端通信
- 所有用户数据存储在 `data/projects.json`,使用 UTF-8 编码
- 项目使用 BMad Method 框架进行开发管理

## 常见开发任务

### 修改界面布局
编辑 `electron/renderer/` 中的 HTML/CSS/JS 文件

### 添加新的 API
1. 在 `backend/server.py` 中添加新路由
2. 在前端 JavaScript 中添加调用

### 修改图标
1. 编辑 `build/generate_icon.py` 中的设计参数
2. 运行 `cd build && python3 generate_icon.py`
3. 在 `electron/main.js` 中更新图标路径

### 调试
- 后端错误查看 Flask 控制台输出
- 前端错误打开 Electron DevTools (Cmd+Option+I)

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
├── data/                # 数据文件
└── core-config.yaml     # 核心配置

.claude/commands/BMad/   # Claude Code 命令集成
├── agents/              # 可用代理
└── tasks/               # 可用任务

.spec-workflow/          # 规格工作流配置
```

## 重要配置文件

- `package.json` - Node.js/Electron 配置
- `backend/requirements.txt` - Python 依赖
- `.bmad-core/core-config.yaml` - BMad 核心配置
- `需求.md` - 项目需求文档
