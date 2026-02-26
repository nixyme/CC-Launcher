# CC 万能启动器

管理和启动 Claude Code 项目的桌面工具。

## 功能

- 项目管理：添加、编辑、删除、拖拽排序
- 多命令支持：每个项目可配置多条命令，一键在终端执行
- 结果查看：快速打开项目结果文件夹
- 导入/导出：JSON 格式配置迁移
- 跨平台：macOS / Windows / Linux

## 快速开始

```bash
npm install
npm start
```

## 打包

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## 项目结构

```
cc-launcher/
├── src/
│   ├── main/
│   │   ├── index.js          # 主进程入口
│   │   ├── ipc-handlers.js   # IPC 通信处理
│   │   └── store.js          # 数据持久化
│   ├── renderer/
│   │   ├── index.html        # 界面
│   │   ├── app.js            # 前端逻辑
│   │   └── styles.css        # 样式
│   └── preload.js            # 预加载脚本
├── build/                    # 构建资源（图标）
├── package.json
└── LICENSE
```

## 数据存储

项目配置自动存储在系统用户数据目录：
- macOS: `~/Library/Application Support/cc-launcher/data/`
- Windows: `%APPDATA%/cc-launcher/data/`
- Linux: `~/.config/cc-launcher/data/`

## 技术栈

- Electron 28
- 纯 Node.js 数据层（无 Python 依赖）
- HTML/CSS/JS 前端

## License

MIT
