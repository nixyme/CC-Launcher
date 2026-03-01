# CLAUDE.md

## 项目概述

START EVERYTHING 是一个纯 Electron 桌面应用，用于管理和启动任何命令行项目。

## 技术栈

- Electron 28 + HTML/CSS/JS
- 纯 Node.js 数据层（无 Python 依赖）
- JSON 数据存储（系统 userData 目录）

## 项目结构

```
START-EVERYTHING/
├── src/
│   ├── main/
│   │   ├── index.js          # 主进程入口
│   │   ├── ipc-handlers.js   # IPC 通信处理
│   │   └── store.js          # 数据持久化（ProjectStore）
│   ├── renderer/
│   │   ├── index.html        # 界面
│   │   ├── app.js            # 前端逻辑
│   │   └── styles.css        # 样式
│   └── preload.js            # 预加载脚本
├── build/                    # 构建资源（图标）
├── package.json
└── LICENSE
```

## 核心模块

### src/main/store.js (ProjectStore)
数据持久化层，替代原 Python 后端：
- CRUD：getAllProjects / addProject / updateProject / deleteProject
- 排序：reorderProjects
- 导入导出：exportData / importData
- 自动备份：数据变化时自动备份到 projects_backup.json
- 数据存储在 `app.getPath('userData')/data/`

### src/main/ipc-handlers.js
IPC 通信集中管理：
- 项目 CRUD 通道：get-projects / add-project / update-project / delete-project
- 排序：reorder-projects
- 命令执行：execute-command（含路径白名单校验）
- 文件操作：open-folder / select-folder / save-file / open-file
- 导入导出：export-projects / import-projects

### src/main/index.js
主进程入口：初始化 store → 注册 IPC → 创建窗口（秒启动，无后端等待）

### src/renderer/app.js
前端逻辑：通过 `window.electronAPI.*` 调用 IPC，无 HTTP 请求

## 启动

```bash
npm install
npm start
```

## 数据格式

```json
{
  "id": "uuid",
  "name": "项目名称",
  "path": "/path/to/project",
  "commands": ["命令1", "命令2"],
  "default_command": "命令1",
  "result_path": "/path/to/results",
  "order": 0
}
```

## 开发注意事项

- 前端通过 IPC 与主进程通信，不走 HTTP
- 用户数据存储在系统 userData 目录，不在项目目录内
- 命令执行前校验 projectPath 是否为已注册项目
- CSP 策略已启用
- nodeIntegration 禁用，contextIsolation 启用

## 常见开发任务

### 修改界面
编辑 `src/renderer/` 中的 HTML/CSS/JS

### 添加新 IPC 通道
1. 在 `src/main/ipc-handlers.js` 添加 handler
2. 在 `src/preload.js` 暴露 API
3. 在 `src/renderer/app.js` 调用

### 调试
前端：Electron DevTools (Cmd+Option+I)
主进程：终端控制台输出
