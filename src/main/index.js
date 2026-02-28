const { app, BrowserWindow, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const ProjectStore = require('./store');
const Scheduler = require('./scheduler');
const { registerIpcHandlers } = require('./ipc-handlers');

let mainWindow;
let store;
let scheduler;

const isDev = !app.isPackaged;

const iconPath = isDev
  ? path.join(__dirname, '../../build/icon.png')
  : path.join(process.resourcesPath, 'build', 'icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 840,
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

// === Auto Updater ===
function setupAutoUpdater() {
  if (isDev) {
    console.log('[AutoUpdater] Skipped in dev mode');
    return null;
  }

  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;           // 检测到更新后自动下载
  autoUpdater.autoInstallOnAppQuit = false;  // 不自动安装，等用户确认

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    if (mainWindow) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Already up to date');
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: Math.round(progress.percent),
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });

  return autoUpdater;
}

// 激活主窗口（从任意位置唤起）
function activateMainWindow() {
  if (!mainWindow) return;
  // macOS 需要先 show app 才能 focus window
  if (process.platform === 'darwin') {
    app.show();   // 从 Dock 隐藏状态恢复
    app.focus({ steal: true });
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
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

  // 初始化调度引擎
  scheduler = new Scheduler(store, () => mainWindow);
  scheduler.init();

  // 初始化自动更新
  const autoUpdater = setupAutoUpdater();

  // 注册 IPC 处理（传入 getMainWindow 函数以便 IPC 获取窗口引用）
  registerIpcHandlers(store, autoUpdater, () => mainWindow, scheduler);

  // 直接创建窗口
  mainWindow = createWindow();

  // 启动后延迟 3 秒自动检查更新
  if (autoUpdater) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[AutoUpdater] Auto-check failed:', err.message);
      });
    }, 3000);
  }

  // 恢复全局快捷键
  const savedShortcut = store.getSetting('globalShortcut');
  if (savedShortcut) {
    try {
      globalShortcut.register(savedShortcut, activateMainWindow);
    } catch (e) {
      console.error('Failed to register global shortcut:', e.message);
    }
  }
});

app.on('will-quit', () => {
  if (scheduler) scheduler.shutdown();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});
