const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const ProjectStore = require('./store');
const { registerIpcHandlers } = require('./ipc-handlers');

let mainWindow;
let store;

const isDev = !app.isPackaged;

const iconPath = isDev
  ? path.join(__dirname, '../../build/icon.png')
  : path.join(process.resourcesPath, 'build', 'icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0F172A',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(() => {
  // macOS Dock 图标
  if (process.platform === 'darwin' && app.dock) {
    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) app.dock.setIcon(icon);
    } catch (e) {
      console.error('Dock 图标设置失败:', e.message);
    }
  }

  // 初始化数据层
  const userDataPath = app.getPath('userData');
  store = new ProjectStore(userDataPath);

  // 注册 IPC 处理
  registerIpcHandlers(store);

  // 直接创建窗口，无需等待后端
  mainWindow = createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});
