const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

// 启动 Python 后端服务
function startPythonBackend() {
    const pythonScript = path.join(__dirname, '../backend/server.py');
    pythonProcess = spawn('python3', [pythonScript]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
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

app.whenReady().then(() => {
    startPythonBackend();

    // 等待 Python 服务启动
    setTimeout(() => {
        createWindow();
    }, 1000);

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
