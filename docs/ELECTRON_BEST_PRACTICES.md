# Electron + Python 后端开发最佳实践

## 1. 后端打包

### 问题
打包后的 Electron 应用依赖用户系统环境（Python、依赖包等），导致启动失败。

### 解决方案
使用 PyInstaller 将 Python 后端打包为独立可执行文件：

```bash
pip3 install pyinstaller
pyinstaller --onefile --name backend-name --distpath backend/dist backend/server.py
```

### package.json 配置

```json
{
  "build": {
    "extraResources": [
      {
        "from": "backend/dist/backend-name",
        "to": "backend/backend-name"
      }
    ]
  }
}
```

### main.js 中区分环境

```javascript
const isDev = !app.isPackaged;

function startBackend() {
    let command, args;

    if (isDev) {
        command = 'python3';
        args = [path.join(__dirname, '../backend/server.py')];
    } else {
        command = path.join(process.resourcesPath, 'backend', 'backend-name');
        args = [];
    }

    backendProcess = spawn(command, args, { cwd, env });
}
```

## 2. 前端等待后端启动

### 问题
前端窗口加载时后端可能还未就绪，导致 API 调用失败。

### 解决方案
实现健康检查轮询机制：

```javascript
function waitForBackend(maxRetries = 30, interval = 500) {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const checkHealth = () => {
            const req = http.request({
                hostname: '127.0.0.1',  // 使用 IPv4
                port: 5283,
                path: '/health',
                method: 'GET',
                timeout: 3000,
                family: 4
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            });

            req.on('error', retry);
            req.on('timeout', () => { req.destroy(); retry(); });
            req.end();
        };

        const retry = () => {
            if (++retries < maxRetries) {
                setTimeout(checkHealth, interval);
            } else {
                reject(new Error('后端启动超时'));
            }
        };

        checkHealth();
    });
}

// 使用
app.whenReady().then(async () => {
    startBackend();
    await waitForBackend();
    createWindow();
});
```

### 后端健康检查端点

```python
@app.route('/health')
def health():
    return jsonify({'status': 'ok'})
```

## 3. 进程生命周期管理

### 启动后端后保存引用

```javascript
let backendProcess;

function startBackend() {
    backendProcess = spawn(...);
}
```

### 应用退出时清理

```javascript
app.on('window-all-closed', () => {
    if (backendProcess) backendProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
    if (backendProcess) backendProcess.kill();
});
```

## 4. 跨平台路径处理

### 数据目录

```javascript
const cwd = isDev
    ? path.join(__dirname, '..')
    : app.getPath('userData');  // 打包后使用用户数据目录
```

### 资源路径

```javascript
const resourcePath = isDev
    ? path.join(__dirname, '../resource')
    : path.join(process.resourcesPath, 'resource');
```

## 5. IPC 通信

### 主进程 (main.js)

```javascript
const { ipcMain, dialog, shell } = require('electron');

// 选择文件夹
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.canceled ? { canceled: true } : { path: result.filePaths[0] };
});

// 打开文件夹
ipcMain.handle('open-folder', async (event, folderPath) => {
    await shell.openPath(folderPath);
    return { success: true };
});
```

### 预加载脚本 (preload.js)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path)
});
```

### 渲染进程

```javascript
const result = await window.electronAPI.selectFolder();
```

## 6. 错误处理

### 后端启动失败提示

```javascript
try {
    await waitForBackend();
    createWindow();
} catch (error) {
    dialog.showErrorBox('启动失败', '后端服务启动失败');
    app.quit();
}
```

### 后端进程错误监听

```javascript
backendProcess.on('error', (err) => {
    console.error('进程启动失败:', err.message);
});

backendProcess.stderr.on('data', (data) => {
    console.error('后端错误:', data.toString());
});
```

## 7. 打包配置

### 多架构支持

```json
{
  "mac": {
    "target": [
      { "target": "dmg", "arch": ["arm64"] },
      { "target": "dmg", "arch": ["x64"] }
    ]
  }
}
```

**注意**：如需 universal 包，需要分别在 arm64 和 x64 机器上打包 Python 后端。

### 必要文件包含

```json
{
  "files": [
    "electron/**/*",
    "!backend/build/**",
    "!backend/dist/**"
  ],
  "extraResources": [
    { "from": "backend/dist/executable", "to": "backend/executable" }
  ]
}
```

## 8. 开发调试

### 开发模式启动

```json
{
  "scripts": {
    "dev": "concurrently \"python3 backend/server.py\" \"electron .\""
  }
}
```

### 开启 DevTools

```javascript
if (isDev) {
    mainWindow.webContents.openDevTools();
}
```

## 9. 安全性

### 禁用 Node 集成

```javascript
webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
}
```

### 使用 127.0.0.1 而非 localhost

避免 IPv6 解析问题：

```javascript
hostname: '127.0.0.1',
family: 4
```

## 10. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 后端启动失败 | 依赖用户环境 | PyInstaller 打包 |
| API 调用失败 | 后端未就绪 | 健康检查等待 |
| 文件路径错误 | 打包后路径变化 | 使用 `process.resourcesPath` |
| 进程残留 | 未正确清理 | 监听 quit 事件 kill 进程 |
| universal 打包失败 | 二进制架构不匹配 | 分架构打包或使用相同架构 |
