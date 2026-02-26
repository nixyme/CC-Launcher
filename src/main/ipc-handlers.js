const { ipcMain, dialog, shell, BrowserWindow, app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Shell 特殊字符转义（防注入）
function escapeShellArg(str) {
  return str.replace(/(["\s'$`\\!#&|;(){}])/g, '\\$1');
}

// 校验路径是否为已注册项目
function isRegisteredProject(store, projectPath) {
  const projects = store.getAllProjects();
  return projects.some((p) => p.path === projectPath);
}

function registerIpcHandlers(store, autoUpdater) {
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

  // --- 命令执行 ---
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
      let proc;

      if (platform === 'darwin') {
        const escapedPath = projectPath.replace(/"/g, '\\"');
        const escapedCmd = command.replace(/"/g, '\\"');
        const script = `tell application "Terminal"
  activate
  do script "cd \\"${escapedPath}\\" && ${escapedCmd}"
end tell`;
        proc = spawn('osascript', ['-e', script]);
      } else if (platform === 'linux') {
        const terminals = ['gnome-terminal', 'xterm', 'xfce4-terminal', 'konsole'];
        const termArgs = {
          'gnome-terminal': ['--', 'bash', '-c', `cd '${projectPath}' && ${command}; exec bash`],
          'xterm': ['-e', `bash -c "cd '${projectPath}' && ${command}; exec bash"`],
          'xfce4-terminal': ['-e', `bash -c "cd '${projectPath}' && ${command}; exec bash"`],
          'konsole': ['-e', 'bash', '-c', `cd '${projectPath}' && ${command}; exec bash`],
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
        proc = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${projectPath}" && ${command}`], { shell: true });
      } else {
        resolve({ success: false, error: `Unsupported platform: ${platform}` });
        return;
      }

      proc.on('close', (code) => resolve({ success: true, code }));
      proc.on('error', (err) => resolve({ success: false, error: err.message }));
    });
  });

  // --- 文件夹操作 ---
  ipcMain.handle('open-folder', async (_event, folderPath) => {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Path does not exist' };
    }
    await shell.openPath(folderPath);
    return { success: true };
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
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Settings',
      defaultPath: defaultName || 'cc-launcher-settings.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled) return { canceled: true };
    fs.writeFileSync(result.filePath, data, 'utf-8');
    return { canceled: false, path: result.filePath };
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