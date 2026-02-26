const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let pythonProcess;

// 判断是否为打包后的应用
const isDev = !app.isPackaged;

// 图标路径
const iconPath = isDev
    ? path.join(__dirname, '../build/icon.png')
    : path.join(process.resourcesPath, 'build', 'icon.png');

// 健康检查:等待后端服务就绪
function waitForBackend(maxRetries = 30, interval = 500) {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const checkHealth = () => {
            const options = {
                hostname: '127.0.0.1',  // 使用 IPv4 地址而不是 localhost
                port: 5283,
                path: '/health',
                method: 'GET',
                timeout: 3000,
                family: 4  // 强制使用 IPv4
            };

            const req = http.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log('✅ 后端服务已就绪');
                        resolve();
                    } else {
                        retry();
                    }
                });
            });

            req.on('error', (err) => {
                // 只在第一次和最后几次重试时显示日志
                if (retries === 0 || retries >= maxRetries - 3) {
                    console.log(`连接后端服务 (尝试 ${retries + 1}/${maxRetries})...`);
                }
                retry();
            });

            req.on('timeout', () => {
                req.destroy();
                if (retries === 0 || retries >= maxRetries - 3) {
                    console.log(`等待后端服务就绪 (尝试 ${retries + 1}/${maxRetries})...`);
                }
                retry();
            });

            req.end();
        };

        const retry = () => {
            retries++;
            if (retries < maxRetries) {
                setTimeout(checkHealth, interval);
            } else {
                console.error('❌ 后端服务启动超时');
                reject(new Error('后端服务启动超时'));
            }
        };

        checkHealth();
    });
}

// 启动 Python 后端服务
function startPythonBackend() {
    // 设置工作目录,确保数据文件可以正确读写
    const cwd = isDev
        ? path.join(__dirname, '..')
        : path.join(app.getPath('userData'));

    console.log('📂 工作目录:', cwd);

    let command, args;

    if (isDev) {
        // 开发模式：使用 python3 运行脚本
        const pythonScript = path.join(__dirname, '../backend/server.py');
        console.log('🐍 Python script path:', pythonScript);
        command = 'python3';
        args = [pythonScript];
    } else {
        // 打包模式：使用打包好的可执行文件
        const backendExecutable = path.join(process.resourcesPath, 'backend', 'cc-launcher-backend');
        console.log('🐍 Backend executable path:', backendExecutable);
        command = backendExecutable;
        args = [];
    }

    pythonProcess = spawn(command, args, {
        cwd: cwd,
        env: { ...process.env, APP_DATA_DIR: cwd }
    });

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        // 只显示关键启动信息
        if (output.includes('🚀') || output.includes('📍')) {
            console.log(`Python: ${output}`);
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        // 过滤掉 Flask 的正常日志（开发服务器警告、访问日志）
        const isNormalLog =
            error.includes('WARNING: This is a development server') ||
            error.includes('Running on') ||
            error.includes('Press CTRL+C to quit') ||
            error.match(/\d+\.\d+\.\d+\.\d+ - - \[.*\] ".*" \d+ -/);

        // 只显示真正的错误
        if (!isNormalLog && error) {
            console.error(`❌ Python 错误: ${error}`);
        }
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });

    pythonProcess.on('error', (err) => {
        console.error(`❌ Python 进程启动失败: ${err.message}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#f0f0f0',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 打开开发者工具（开发时使用）
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // 设置 macOS Dock 图标
    if (process.platform === 'darwin' && app.dock) {
        const icon = nativeImage.createFromPath(iconPath);
        app.dock.setIcon(icon);
    }

    console.log('🚀 启动应用...');
    startPythonBackend();

    try {
        // 等待后端服务真正就绪
        await waitForBackend();
        createWindow();
    } catch (error) {
        console.error('后端启动失败:', error);
        // 显示错误对话框
        const { dialog } = require('electron');
        dialog.showErrorBox(
            '启动失败',
            '后端服务启动失败,请检查:\n1. Python3 是否已安装\n2. Flask 依赖是否已安装 (pip3 install flask flask-cors)\n3. 端口 5283 是否被占用'
        );
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});

// IPC 通信处理
ipcMain.handle('execute-command', async (event, { projectPath, command }) => {
    return new Promise((resolve, reject) => {
        const platform = process.platform;
        let execCommand;

        if (platform === 'darwin') {
            // macOS
            const escapedPath = projectPath.replace(/"/g, '\\"');
            const escapedCommand = command.replace(/"/g, '\\"');
            const appleScript = `
                tell application "Terminal"
                    activate
                    do script "cd \\"${escapedPath}\\" && ${escapedCommand}"
                end tell
            `;
            execCommand = spawn('osascript', ['-e', appleScript]);
        } else if (platform === 'linux') {
            // Linux
            execCommand = spawn('x-terminal-emulator', ['-e', `bash -c "cd '${projectPath}' && ${command}"`]);
        } else if (platform === 'win32') {
            // Windows
            execCommand = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${projectPath}" && ${command}`]);
        }

        execCommand.on('close', (code) => {
            resolve({ success: true, code });
        });

        execCommand.on('error', (error) => {
            reject({ success: false, error: error.message });
        });
    });
});

ipcMain.handle('open-folder', async (event, folderPath) => {
    const { shell } = require('electron');
    await shell.openPath(folderPath);
    return { success: true };
});

ipcMain.handle('select-folder', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择文件夹'
    });

    if (result.canceled) {
        return { canceled: true };
    } else {
        return { canceled: false, path: result.filePaths[0] };
    }
});

ipcMain.handle('save-file', async (event, { data, defaultName }) => {
    const { writeFile } = require('fs').promises;
    const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出设置',
        defaultPath: defaultName || 'cc-launcher-settings.json',
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ]
    });

    if (result.canceled) {
        return { canceled: true };
    }

    await writeFile(result.filePath, data, 'utf-8');
    return { canceled: false, path: result.filePath };
});

ipcMain.handle('open-file', async (event) => {
    const { readFile } = require('fs').promises;
    const result = await dialog.showOpenDialog(mainWindow, {
        title: '导入设置',
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        properties: ['openFile']
    });

    if (result.canceled) {
        return { canceled: true };
    }

    const content = await readFile(result.filePaths[0], 'utf-8');
    return { canceled: false, data: content };
});
