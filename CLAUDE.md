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

## Git 规范

- 所有 commit message 必须使用英文，遵循 Conventional Commits 格式（`feat:` / `fix:` / `chore:` 等）
- README.md 及面向用户的文档使用英文撰写，确保全球开发者可读
- 代码注释优先使用英文；CLAUDE.md 作为内部开发指引可使用中文

## 跨平台要求

- 所有功能必须适配 macOS、Windows、Linux 三大主流系统
- 禁止编写仅适用于单一操作系统的代码，必须包含平台分支逻辑（`process.platform`）
- Shell 命令执行：macOS/Linux 使用用户默认 shell + RC 文件加载，Windows 使用 cmd/PowerShell
- 文件路径：使用 `path.join()` 拼接，禁止硬编码 `/` 或 `\`
- 开机自启动：macOS 用 LaunchAgent plist，Windows 用 Electron 内置 API，Linux 用 XDG Autostart .desktop
- 新功能开发前须确认三平台实现方案，写代码时逐平台测试

## 国际化（i18n）要求

- 所有界面文本必须同时支持 4 种语言：English (en)、简体中文 (zh)、日本語 (ja)、Français (fr)
- 新增或修改任何用户可见文案时，必须同步更新 `src/renderer/i18n.js` 中所有 4 种语言的翻译
- 禁止在代码中硬编码界面文本，所有文案通过 `t('key')` 函数获取
- HTML 元素使用 `data-i18n` / `data-i18n-placeholder` / `data-i18n-title` 属性绑定翻译 key
- 翻译 key 命名规范：`模块.功能`（如 `file.title`、`subproject.add`）

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
