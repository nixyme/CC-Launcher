# Claude Code 万能启动器 (Electron 版)

> 基于 Electron + Flask 的跨平台桌面应用

## 技术栈

### 前端
- **Electron**: 跨平台桌面应用框架
- **HTML/CSS/JavaScript**: 原生 Web 技术
- **现代 UI 设计**: 响应式布局,美观的界面

### 后端
- **Flask**: Python Web 框架
- **REST API**: 标准的 HTTP 接口
- **JSON**: 数据存储格式

## 项目结构

```
CC万能启动器/
├── electron/                # Electron 主进程和渲染进程
│   ├── main.js             # 主进程 - 窗口管理和系统交互
│   ├── preload.js          # 预加载脚本 - 安全桥接
│   └── renderer/           # 渲染进程 - 用户界面
│       ├── index.html      # 主页面
│       ├── styles.css      # 样式文件
│       └── app.js          # 前端逻辑
├── backend/                # Python 后端服务
│   ├── server.py           # Flask API 服务器
│   └── requirements.txt    # Python 依赖
├── src/                    # 共享代码
│   ├── project_manager.py  # 项目管理逻辑
│   └── command_executor.py # 命令执行逻辑
├── data/                   # 数据存储
│   └── projects.json       # 项目数据文件
├── package.json            # Node.js 项目配置
├── start.sh                # 启动脚本
└── README_ELECTRON.md      # 本文档
```

## 安装依赖

### 1. Node.js 依赖

```bash
npm install
```

这将安装:
- `electron`: Electron 框架
- `electron-builder`: 打包工具
- `concurrently`: 并发运行工具
- `axios`: HTTP 客户端

### 2. Python 依赖

```bash
pip3 install -r backend/requirements.txt
```

这将安装:
- `Flask`: Web 框架
- `flask-cors`: 跨域支持

## 运行应用

### 方法 1: 使用启动脚本(推荐)

```bash
./start.sh
```

该脚本会:
1. 检查依赖是否安装
2. 自动安装缺失的依赖
3. 启动 Flask 后端服务
4. 启动 Electron 应用

### 方法 2: 手动启动

1. 启动 Flask 后端:
```bash
python3 backend/server.py
```

2. 在另一个终端启动 Electron:
```bash
npm start
```

### 方法 3: 并发启动(开发模式)

```bash
npm run dev
```

## 功能特性

### ✅ 项目管理
- 添加、编辑、删除项目
- 项目列表实时更新
- 美观的侧边栏导航

### ✅ 命令执行
- 在新终端窗口执行命令
- 支持 macOS、Linux、Windows
- 实时编辑和更新命令

### ✅ 结果查看
- 一键打开结果文件夹
- 跨平台文件管理器集成

### ✅ 用户体验
- 现代化 UI 设计
- 响应式布局
- 实时通知提示
- 流畅的动画效果

## API 接口

后端提供以下 REST API:

- `GET /projects` - 获取所有项目
- `POST /projects` - 创建新项目
- `GET /projects/:id` - 获取单个项目
- `PUT /projects/:id` - 更新项目
- `DELETE /projects/:id` - 删除项目
- `GET /health` - 健康检查

## 开发调试

### 启用开发者工具

在 `electron/main.js` 中取消注释:

```javascript
mainWindow.webContents.openDevTools();
```

### 查看后端日志

后端日志会输出到控制台,可以看到所有 API 请求和响应。

### 修改 API 端口

默认端口为 5000,如需修改:

1. 修改 `backend/server.py` 中的端口
2. 修改 `electron/preload.js` 中的 `apiUrl`

## 打包应用

使用 electron-builder 打包:

```bash
npm run build
```

这将生成可分发的应用程序。

## 优势对比

相比 Tkinter 版本:

1. ✅ **跨平台兼容性更好** - 不依赖系统 Tkinter 版本
2. ✅ **UI 更现代美观** - HTML/CSS 的强大表现力
3. ✅ **更易维护** - 前后端分离架构
4. ✅ **扩展性强** - 可以轻松添加新功能
5. ✅ **打包分发简单** - electron-builder 一键打包

## 常见问题

### Q: 端口 5000 被占用怎么办?

A: 修改 `backend/server.py` 和 `electron/preload.js` 中的端口号。

### Q: 如何修改窗口大小?

A: 在 `electron/main.js` 的 `createWindow` 函数中修改 `width` 和 `height`。

### Q: 支持哪些操作系统?

A: macOS、Linux、Windows 全平台支持。

### Q: 数据存储在哪里?

A: 项目数据存储在 `data/projects.json` 文件中。

## 后续开发建议

1. 添加项目搜索功能
2. 支持项目分组/标签
3. 添加命令历史记录
4. 支持自定义主题
5. 添加快捷键支持
6. 实现项目导入/导出

## 许可证

MIT License
