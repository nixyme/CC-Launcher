const { ipcMain, dialog, shell, BrowserWindow, app, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Shell 特殊字符转义（防注入）
function escapeShellArg(str) {
  return str.replace(/(["\\s'$`\\\\!#&|;(){}])/g, '\\$1');
}

// 校验路径是否为已注册项目
function isRegisteredProject(store, projectPath) {
  const projects = store.getAllProjects();
  return projects.some((p) => p.path === projectPath);
}

// 智能处理命令路径：自动补 ./ 并给含空格的路径加单引号
// 返回 shell 安全的命令字符串
function normalizeCommandPath(command, projectPath) {
  // 已经被引号包裹的，不处理
  if (command.startsWith('"') || command.startsWith("'")) return command;

  // 尝试整条命令或逐词缩短，找到存在的文件路径
  const words = command.split(/\s+/);
  for (let i = words.length; i >= 1; i--) {
    const candidate = words.slice(0, i).join(' ');
    const rest = i < words.length ? ' ' + words.slice(i).join(' ') : '';

    // 相对路径：拼接项目目录检查
    if (!candidate.startsWith('/') && !candidate.startsWith('./') && !candidate.startsWith('~')) {
      const fullPath = path.join(projectPath, candidate);
      if (fs.existsSync(fullPath)) {
        const safePath = './' + candidate.replace(/'/g, "'\\''");
        return "'" + safePath + "'" + rest;
      }
    } else {
      // 绝对路径或 ./ 开头
      if (fs.existsSync(candidate)) {
        if (candidate.includes(' ')) {
          const safePath = candidate.replace(/'/g, "'\\''");
          return "'" + safePath + "'" + rest;
        }
        return command;
      }
    }
  }
  return command;
}

function registerIpcHandlers(store, autoUpdater, getMainWindow) {
  // --- 项目 CRUD ---
  ipcMain.handle('get-projects', () => {
    try {
      return { success: true, data: store.getAllProjects() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('add-project', (_event, project) => {
    try {
      const result = store.addProject(project);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update-project', (_event, { id, updates }) => {
    try {
      const result = store.updateProject(id, updates);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-project', (_event, id) => {
    try {
      const result = store.deleteProject(id);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('reorder-projects', (_event, projectIds) => {
    try {
      store.reorderProjects(projectIds);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update-command', (_event, { projectId, index, command }) => {
    try {
      const result = store.updateCommandAtIndex(projectId, index, command);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- 导入/导出 ---
  ipcMain.handle('export-projects', () => {
    try {
      return { success: true, data: store.exportData() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('import-projects', (_event, data) => {
    try {
      const result = store.importData(data);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- 命令执行（支持终端选择） ---
  ipcMain.handle('execute-command', (_event, { projectPath, command }) => {
    return new Promise((resolve) => {
      if (!isRegisteredProject(store, projectPath)) {
        resolve({ success: false, error: 'Unregistered project path' });
        return;
      }
      if (!fs.existsSync(projectPath)) {
        resolve({ success: false, error: 'Project path does not exist' });
        return;
      }

      const platform = process.platform;
      const terminal = store.getSetting('terminal') || 'default';
      let proc;

      // 智能处理命令中的文件路径：自动补 ./ 和引号
      // 逐步尝试更长的前缀，找到真实存在的文件路径
      command = normalizeCommandPath(command, projectPath);

      if (platform === 'darwin') {
        if (terminal === 'kaku') {
          if (!fs.existsSync('/Applications/Kaku.app')) {
            resolve({ success: false, error: 'Kaku.app not found in /Applications' });
            return;
          }
          proc = spawn('open', ['-n', '-a', 'Kaku', '--args', 'start', '--always-new-process', '--cwd', projectPath, '--', 'bash', '-c', "cd '" + projectPath + "' && " + command + "; exec bash"], { detached: true });
          proc.unref();
        } else {
          // Default: Terminal.app via AppleScript（单引号包裹路径避免转义问题）
          const safePath = projectPath.replace(/'/g, "'\\'");
          const script = `tell application "Terminal"
  activate
  do script "cd '${safePath}' && ${command}"
end tell`;
          proc = spawn('osascript', ['-e', script]);
        }
      } else if (platform === 'linux') {
        const terminals = ['gnome-terminal', 'xterm', 'xfce4-terminal', 'konsole'];
        const termArgs = {
          'gnome-terminal': ['--', 'bash', '-c', "cd '" + projectPath + "' && " + command + '; exec bash'],
          'xterm': ['-e', 'bash -c "cd \'' + projectPath + '\' && ' + command + '; exec bash"'],
          'xfce4-terminal': ['-e', 'bash -c "cd \'' + projectPath + '\' && ' + command + '; exec bash"'],
          'konsole': ['-e', 'bash', '-c', "cd '" + projectPath + "' && " + command + '; exec bash'],
        };
        let launched = false;
        for (const term of terminals) {
          try {
            proc = spawn(term, termArgs[term], { detached: true });
            launched = true;
            break;
          } catch { /* try next */ }
        }
        if (!launched) {
          resolve({ success: false, error: 'No terminal emulator found' });
          return;
        }
      } else if (platform === 'win32') {
        proc = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', 'cd /d "' + projectPath + '" && ' + command], { shell: true });
      } else {
        resolve({ success: false, error: 'Unsupported platform: ' + platform });
        return;
      }

      proc.on('close', (code) => resolve({ success: true, code }));
      proc.on('error', (err) => resolve({ success: false, error: err.message }));
    });
  });

  // --- 路径类型检测 ---
  ipcMain.handle('check-path-type', (_event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return { exists: false };
      const stat = fs.statSync(filePath);
      return { exists: true, isDirectory: stat.isDirectory(), isFile: stat.isFile() };
    } catch (e) {
      return { exists: false, error: e.message };
    }
  });

  // --- 文件夹操作 ---
  ipcMain.handle('open-folder', async (_event, folderPath) => {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Path does not exist' };
    }
    await shell.openPath(folderPath);
    return { success: true };
  });

  ipcMain.handle('select-file', async (_event, defaultPath) => {
    const win = BrowserWindow.getFocusedWindow();
    const opts = {
      properties: ['openFile'],
      title: 'Select Executable',
    };
    if (defaultPath && fs.existsSync(defaultPath)) opts.defaultPath = defaultPath;
    const result = await dialog.showOpenDialog(win, opts);
    if (result.canceled) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Folder',
    });
    if (result.canceled) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('save-file', async (_event, { data, defaultName }) => {
    const win = BrowserWindow.getFocusedWindow();
    const lastPath = store.getSetting('lastExportPath');
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Settings',
      defaultPath: lastPath || defaultName || 'cc-launcher-settings.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled) return { canceled: true };
    fs.writeFileSync(result.filePath, data, 'utf-8');
    store.setSetting('lastExportPath', result.filePath);
    return { canceled: false, path: result.filePath };
  });

  // 快速保存：直接写入上次导出路径，无路径则返回需要弹窗
  ipcMain.handle('quick-save-file', async (_event, data) => {
    const lastPath = store.getSetting('lastExportPath');
    if (!lastPath) return { needsDialog: true };
    try {
      fs.writeFileSync(lastPath, data, 'utf-8');
      return { success: true, path: lastPath };
    } catch (e) {
      return { needsDialog: true, error: e.message };
    }
  });

  // --- 窗口控制 ---
  ipcMain.handle('hide-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (process.platform === 'darwin') app.hide();
      else win.hide();
    }
    return { success: true };
  });

  ipcMain.handle('minimize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
    return { success: true };
  });

  ipcMain.handle('open-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Import Settings',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { canceled: true };
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { canceled: false, data: content };
  });

  // --- Locale ---
  ipcMain.handle('get-locale', () => {
    return store.getSetting('locale');
  });

  ipcMain.handle('set-locale', (_event, locale) => {
    store.setSetting('locale', locale);
    return { success: true };
  });

  // --- Terminal Setting ---
  ipcMain.handle('get-terminal', () => {
    return store.getSetting('terminal') || 'default';
  });

  ipcMain.handle('set-terminal', (_event, terminal) => {
    store.setSetting('terminal', terminal);
    return { success: true };
  });

  // --- Global Shortcut ---
  ipcMain.handle('get-global-shortcut', () => {
    return store.getSetting('globalShortcut') || '';
  });

  ipcMain.handle('set-global-shortcut', (_event, accelerator) => {
    // Unregister old
    const old = store.getSetting('globalShortcut');
    if (old) {
      try { globalShortcut.unregister(old); } catch { /* ignore */ }
    }

    if (!accelerator) {
      store.setSetting('globalShortcut', '');
      return { success: true };
    }

    // Check conflict
    if (globalShortcut.isRegistered(accelerator)) {
      return { success: false, error: 'conflict' };
    }

    try {
      const ok = globalShortcut.register(accelerator, () => {
        const win = getMainWindow();
        if (!win) return;
        if (process.platform === 'darwin') {
          app.show();
          app.focus({ steal: true });
        }
        if (win.isMinimized()) win.restore();
        if (!win.isVisible()) win.show();
        win.focus();
      });
      if (!ok) {
        return { success: false, error: 'register_failed' };
      }
      store.setSetting('globalShortcut', accelerator);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Settings: Auto Launch ---
  ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return { success: true };
  });

  // --- App Info ---
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // --- Auto Update ---
  ipcMain.handle('check-for-update', async () => {
    if (!autoUpdater) return { success: false, error: 'Updater not available in dev mode' };
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    if (!autoUpdater) return { success: false, error: 'Updater not available' };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('install-update', () => {
    if (!autoUpdater) return { success: false, error: 'Updater not available' };
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });
}

module.exports = { registerIpcHandlers };