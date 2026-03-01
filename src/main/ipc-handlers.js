const { ipcMain, dialog, shell, BrowserWindow, app, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Shell 特殊字符转义（防注入）
function escapeShellArg(str) {
  return str.replace(/(["\\s'$`\\\\!#&|;(){}])/g, '\\$1');
}

// 解析工作目录：空路径回退到桌面
function resolveWorkDir(projectPath) {
  if (projectPath && fs.existsSync(projectPath)) return projectPath;
  return app.getPath('desktop');
}

// 校验路径是否为已注册项目（空路径也视为合法）
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

// 版本号比较：返回 1(a>b), -1(a<b), 0(a==b)
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function registerIpcHandlers(store, autoUpdater, getMainWindow, scheduler) {
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
      // 联动清理该项目的所有 schedule 和日志
      if (scheduler) {
        const schedules = store.getAllSchedules().filter(s => s.projectId === id);
        for (const s of schedules) {
          store.clearScheduleLogs(s.id);
        }
        scheduler.removeSchedulesByProject(id);
      }
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

  ipcMain.handle('toggle-pin', (_event, id) => {
    try {
      const result = store.togglePin(id);
      return { success: true, data: result };
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
  ipcMain.handle('execute-command', (_event, { projectPath, command, projectName, commandName }) => {
    return new Promise((resolve) => {
      if (!isRegisteredProject(store, projectPath)) {
        resolve({ success: false, error: 'Unregistered project path' });
        return;
      }
      const workDir = resolveWorkDir(projectPath);

      const startTime = new Date().toISOString();
      const platform = process.platform;
      const terminal = store.getSetting('terminal') || 'default';
      let proc;

      // 智能处理命令中的文件路径：自动补 ./ 和引号
      command = normalizeCommandPath(command, workDir);

      if (platform === 'darwin') {
        if (terminal === 'kaku') {
          if (!fs.existsSync('/Applications/Kaku.app')) {
            resolve({ success: false, error: 'Kaku.app not found in /Applications' });
            return;
          }
          proc = spawn('open', ['-n', '-a', 'Kaku', '--args', 'start', '--always-new-process', '--cwd', workDir, '--', 'zsh', '-l', '-c', "cd '" + workDir.replace(/'/g, "'\\''") + "' && " + command + "; exec zsh"], { detached: true });
          proc.unref();
        } else {
          const safePath = workDir.replace(/'/g, "'\\'");
          const script = `tell application "Terminal"
  activate
  do script "cd '${safePath}' && ${command}"
end tell`;
          proc = spawn('osascript', ['-e', script]);
        }
      } else if (platform === 'linux') {
        const terminals = ['gnome-terminal', 'xterm', 'xfce4-terminal', 'konsole'];
        const termArgs = {
          'gnome-terminal': ['--', 'bash', '-c', "cd '" + workDir + "' && " + command + '; exec bash'],
          'xterm': ['-e', 'bash -c "cd \'' + workDir + '\' && ' + command + '; exec bash"'],
          'xfce4-terminal': ['-e', 'bash -c "cd \'' + workDir + '\' && ' + command + '; exec bash"'],
          'konsole': ['-e', 'bash', '-c', "cd '" + workDir + "' && " + command + '; exec bash'],
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
        proc = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', 'cd /d "' + workDir + '" && ' + command], { shell: true });
      } else {
        resolve({ success: false, error: 'Unsupported platform: ' + platform });
        return;
      }

      proc.on('close', (code) => {
        // 终端执行也记录日志（无 stdout 捕获，仅记录事件）
        store.addScheduleLog({
          scheduleId: null,
          projectName: projectName || '',
          commandName: commandName || '',
          command,
          startTime,
          endTime: new Date().toISOString(),
          durationMs: Date.now() - new Date(startTime).getTime(),
          exitCode: code,
          stdout: '',
          stderr: '',
          status: code === 0 ? 'success' : (code === null ? 'success' : 'failed'),
          trigger: 'manual',
          mode: 'terminal',
        });
        resolve({ success: true, code });
      });
      proc.on('error', (err) => {
        store.addScheduleLog({
          scheduleId: null,
          projectName: projectName || '',
          commandName: commandName || '',
          command,
          startTime,
          endTime: new Date().toISOString(),
          durationMs: Date.now() - new Date(startTime).getTime(),
          exitCode: -1,
          stdout: '',
          stderr: err.message,
          status: 'error',
          trigger: 'manual',
          mode: 'terminal',
        });
        resolve({ success: false, error: err.message });
      });
    });
  });

  // --- 静默执行命令 ---
  ipcMain.handle('execute-command-silent', (_event, { projectPath, command, projectName, commandName }) => {
    return new Promise((resolve) => {
      if (!isRegisteredProject(store, projectPath)) {
        resolve({ success: false, error: 'Unregistered project path' });
        return;
      }
      const workDir = resolveWorkDir(projectPath);

      command = normalizeCommandPath(command, workDir);

      const startTime = new Date().toISOString();
      const MAX_OUTPUT = 10 * 1024;
      let stdout = '';
      let stderr = '';

      const proc = spawn('bash', ['-c', `cd '${workDir.replace(/'/g, "'\\''")}' && ${command}`], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
      });

      proc.stdout.on('data', (data) => {
        if (stdout.length < MAX_OUTPUT) {
          stdout += data.toString();
          if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT);
        }
      });

      proc.stderr.on('data', (data) => {
        if (stderr.length < MAX_OUTPUT) {
          stderr += data.toString();
          if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT);
        }
      });

      // 默认 60 分钟超时
      const timer = setTimeout(() => {
        try { proc.kill('SIGTERM'); } catch { /* ignore */ }
        setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* ignore */ }
        }, 5000);
      }, 60 * 60 * 1000);

      proc.on('close', (code, signal) => {
        clearTimeout(timer);
        const endTime = new Date().toISOString();
        const durationMs = Date.now() - new Date(startTime).getTime();
        let status = 'success';
        if (signal === 'SIGTERM' || signal === 'SIGKILL') status = 'timeout';
        else if (code !== 0) status = 'failed';

        store.addScheduleLog({
          scheduleId: null,
          projectName: projectName || '',
          commandName: commandName || '',
          command,
          startTime,
          endTime,
          durationMs,
          exitCode: code,
          stdout,
          stderr,
          status,
          trigger: 'manual',
          mode: 'silent',
        });

        // 通知渲染进程
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('silent-execution-complete', {
            projectName, commandName, command, status, durationMs,
          });
        }

        resolve({ success: status === 'success', code, stdout, stderr, status, durationMs });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        const endTime = new Date().toISOString();
        store.addScheduleLog({
          scheduleId: null,
          projectName: projectName || '',
          commandName: commandName || '',
          command,
          startTime,
          endTime,
          durationMs: Date.now() - new Date(startTime).getTime(),
          exitCode: -1,
          stdout,
          stderr: err.message,
          status: 'error',
          trigger: 'manual',
          mode: 'silent',
        });
        resolve({ success: false, error: err.message, status: 'error' });
      });
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
      defaultPath: lastPath || defaultName || 'start-everything-settings.json',
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

  // --- Open Data Dir ---
  ipcMain.handle('open-data-dir', async () => {
    try {
      await shell.openPath(store.dataDir);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Reset Data ---
  ipcMain.handle('reset-data', () => {
    try {
      store.resetData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Search History ---
  ipcMain.handle('get-search-history', () => {
    return store.getSetting('searchHistory') || [];
  });

  ipcMain.handle('save-search-history', (_event, history) => {
    store.setSetting('searchHistory', history);
    return { success: true };
  });

  // --- Open URL ---
  ipcMain.handle('open-url', async (_event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
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

  // --- Auto Update (GitHub API) ---
  ipcMain.handle('check-for-update', async () => {
    const https = require('https');
    const currentVersion = app.getVersion();
    return new Promise((resolve) => {
      const opts = {
        hostname: 'api.github.com',
        path: '/repos/nixyme/start-everything/releases/latest',
        headers: { 'User-Agent': 'START-EVERYTHING/' + currentVersion },
      };
      https.get(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              resolve({ success: false, error: `GitHub API: ${res.statusCode}` });
              return;
            }
            const release = JSON.parse(data);
            const latestVersion = (release.tag_name || '').replace(/^v/, '');
            if (!latestVersion) {
              resolve({ success: false, error: 'No version found' });
              return;
            }
            // 找到 DMG 下载链接
            const dmgAsset = (release.assets || []).find(a => a.name.endsWith('.dmg'));
            const isNewer = compareVersions(latestVersion, currentVersion) > 0;
            resolve({
              success: true,
              data: {
                currentVersion,
                latestVersion,
                isNewer,
                releaseNotes: release.body || '',
                downloadUrl: dmgAsset ? dmgAsset.browser_download_url : release.html_url,
                releaseUrl: release.html_url,
              },
            });
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      }).on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
    });
  });

  // 直接下载 DMG 到临时目录，通过事件报告进度
  ipcMain.handle('download-update', async (_event, url) => {
    const https = require('https');
    const http = require('http');
    const os = require('os');
    const tmpDir = path.join(os.tmpdir(), 'start-everything-update');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const fileName = url.split('/').pop() || 'Start-Everything-update.dmg';
    const filePath = path.join(tmpDir, fileName);
    const win = getMainWindow();

    return new Promise((resolve) => {
      const doDownload = (downloadUrl, redirectCount) => {
        if (redirectCount > 5) {
          resolve({ success: false, error: 'Too many redirects' });
          return;
        }
        const mod = downloadUrl.startsWith('https') ? https : http;
        mod.get(downloadUrl, { headers: { 'User-Agent': 'Start-Everything/' + app.getVersion() } }, (res) => {
          // 跟随重定向
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doDownload(res.headers.location, redirectCount + 1);
            return;
          }
          if (res.statusCode !== 200) {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
            return;
          }
          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloaded = 0;
          const file = fs.createWriteStream(filePath);
          let lastPercent = 0;
          res.on('data', (chunk) => {
            downloaded += chunk.length;
            file.write(chunk);
            if (win && !win.isDestroyed() && totalBytes > 0) {
              const percent = Math.round((downloaded / totalBytes) * 100);
              // 节流：每变化 1% 才发送，避免过于频繁
              if (percent > lastPercent) {
                lastPercent = percent;
                win.webContents.send('update-download-progress', { percent, downloaded, total: totalBytes });
              }
            }
          });
          res.on('end', () => {
            file.end(() => {
              // 确保发送 100%
              if (win && !win.isDestroyed()) {
                win.webContents.send('update-download-progress', { percent: 100, downloaded: totalBytes || downloaded, total: totalBytes || downloaded });
              }
              resolve({ success: true, filePath });
            });
          });
          res.on('error', (e) => {
            file.end();
            resolve({ success: false, error: e.message });
          });
        }).on('error', (e) => {
          resolve({ success: false, error: e.message });
        });
      };
      doDownload(url, 0);
    });
  });

  // 自动安装：挂载 DMG → 复制 .app 到 /Applications → 卸载 → 重启
  ipcMain.handle('install-update', async (_event, filePath) => {
    const { execSync } = require('child_process');
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'DMG file not found' };
      }

      // 1. 挂载 DMG，解析挂载点
      const mountOutput = execSync(`hdiutil attach "${filePath}" -nobrowse -noverify -noautoopen 2>&1`, { encoding: 'utf-8' });
      const mountMatch = mountOutput.match(/\/Volumes\/.+/);
      if (!mountMatch) {
        return { success: false, error: 'Failed to mount DMG: ' + mountOutput };
      }
      const mountPoint = mountMatch[0].trim();

      // 2. 找到 .app
      const items = fs.readdirSync(mountPoint);
      const appName = items.find(f => f.endsWith('.app'));
      if (!appName) {
        execSync(`hdiutil detach "${mountPoint}" -force 2>/dev/null`);
        return { success: false, error: 'No .app found in DMG' };
      }

      const srcApp = path.join(mountPoint, appName);
      const destApp = path.join('/Applications', appName);

      // 3. 删除旧版本，复制新版本
      if (fs.existsSync(destApp)) {
        execSync(`rm -rf "${destApp}"`);
      }
      execSync(`cp -R "${srcApp}" "/Applications/"`);

      // 4. 移除 quarantine 属性
      execSync(`xattr -cr "${destApp}" 2>/dev/null || true`);

      // 5. 卸载 DMG
      execSync(`hdiutil detach "${mountPoint}" -force 2>/dev/null || true`);

      // 6. 清理下载文件
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }

      // 7. 重启应用
      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      setTimeout(() => app.quit(), 800);

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Schedule CRUD ---
  ipcMain.handle('get-schedules', () => {
    try {
      return { success: true, data: store.getAllSchedules() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-schedule-for-command', (_event, { projectId, commandIndex }) => {
    try {
      const schedule = store.getScheduleForCommand(projectId, commandIndex);
      return { success: true, data: schedule };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('add-schedule', (_event, data) => {
    try {
      if (!scheduler) return { success: false, error: 'Scheduler not available' };
      const result = scheduler.addSchedule(data);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update-schedule', (_event, { id, updates }) => {
    try {
      if (!scheduler) return { success: false, error: 'Scheduler not available' };
      const result = scheduler.updateSchedule(id, updates);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-schedule', (_event, id) => {
    try {
      if (!scheduler) return { success: false, error: 'Scheduler not available' };
      const result = scheduler.removeSchedule(id);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('toggle-schedule', (_event, { id, enabled }) => {
    try {
      if (!scheduler) return { success: false, error: 'Scheduler not available' };
      const result = scheduler.toggleSchedule(id, enabled);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Schedule Logs ---
  ipcMain.handle('get-schedule-logs', (_event, opts) => {
    try {
      return { success: true, data: store.getScheduleLogs(opts || {}) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('clear-schedule-logs', (_event, scheduleId) => {
    try {
      if (scheduleId) store.clearScheduleLogs(scheduleId);
      else store.clearAllScheduleLogs();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Cron Validation ---
  ipcMain.handle('validate-cron', (_event, expression) => {
    const cron = require('node-cron');
    return { valid: cron.validate(expression) };
  });
}

module.exports = { registerIpcHandlers };