const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 项目 CRUD
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project) => ipcRenderer.invoke('add-project', project),
  updateProject: (id, updates) => ipcRenderer.invoke('update-project', { id, updates }),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  reorderProjects: (ids) => ipcRenderer.invoke('reorder-projects', ids),
  togglePin: (id) => ipcRenderer.invoke('toggle-pin', id),
  updateCommand: (projectId, index, command) =>
    ipcRenderer.invoke('update-command', { projectId, index, command }),

  // 导入/导出
  exportProjects: () => ipcRenderer.invoke('export-projects'),
  importProjects: (data) => ipcRenderer.invoke('import-projects', data),

  // 命令执行
  executeCommand: (projectPath, command, projectName, commandName) =>
    ipcRenderer.invoke('execute-command', { projectPath, command, projectName, commandName }),
  executeCommandSilent: (projectPath, command, projectName, commandName) =>
    ipcRenderer.invoke('execute-command-silent', { projectPath, command, projectName, commandName }),

  // 打开配置目录
  openDataDir: () => ipcRenderer.invoke('open-data-dir'),
  // 获取最近导入/导出目录
  getLastImportExportDir: () => ipcRenderer.invoke('get-last-import-export-dir'),
  // 重置数据
  resetData: () => ipcRenderer.invoke('reset-data'),

  // 搜索历史
  getSearchHistory: () => ipcRenderer.invoke('get-search-history'),
  saveSearchHistory: (history) => ipcRenderer.invoke('save-search-history', history),

  // 打开网址
  openUrl: (url) => ipcRenderer.invoke('open-url', url),

  // 文件夹操作
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (defaultPath) => ipcRenderer.invoke('select-file', defaultPath),
  checkPathType: (filePath) => ipcRenderer.invoke('check-path-type', filePath),

  // 文件操作（使用默认应用打开）
  openFileWithDefault: (filePath) => ipcRenderer.invoke('open-file-with-default', filePath),

  // 文件对话框
  saveFile: (data, defaultName) => ipcRenderer.invoke('save-file', { data, defaultName }),
  quickSaveFile: (data) => ipcRenderer.invoke('quick-save-file', data),
  openFile: () => ipcRenderer.invoke('open-file'),

  // 窗口控制
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),

  // 语言设置
  getLocale: () => ipcRenderer.invoke('get-locale'),
  setLocale: (locale) => ipcRenderer.invoke('set-locale', locale),

  // 终端设置
  getTerminal: () => ipcRenderer.invoke('get-terminal'),
  setTerminal: (terminal) => ipcRenderer.invoke('set-terminal', terminal),

  // 全局快捷键
  getGlobalShortcut: () => ipcRenderer.invoke('get-global-shortcut'),
  setGlobalShortcut: (accelerator) => ipcRenderer.invoke('set-global-shortcut', accelerator),

  // 设置
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 自动更新（GitHub API 方式）
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),
  installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
  onUpdateDownloadProgress: (cb) => ipcRenderer.on('update-download-progress', (_e, data) => cb(data)),

  // 定时任务
  getSchedules: () => ipcRenderer.invoke('get-schedules'),
  getScheduleForCommand: (projectId, commandIndex) =>
    ipcRenderer.invoke('get-schedule-for-command', { projectId, commandIndex }),
  addSchedule: (data) => ipcRenderer.invoke('add-schedule', data),
  updateSchedule: (id, updates) => ipcRenderer.invoke('update-schedule', { id, updates }),
  deleteSchedule: (id) => ipcRenderer.invoke('delete-schedule', id),
  toggleSchedule: (id, enabled) => ipcRenderer.invoke('toggle-schedule', { id, enabled }),

  // 定时任务日志
  getScheduleLogs: (opts) => ipcRenderer.invoke('get-schedule-logs', opts),
  clearScheduleLogs: (scheduleId) => ipcRenderer.invoke('clear-schedule-logs', scheduleId),

  // Cron 校验
  validateCron: (expression) => ipcRenderer.invoke('validate-cron', expression),

  // 定时任务执行事件
  onScheduleExecuted: (cb) => ipcRenderer.on('schedule-executed', (_e, data) => cb(data)),
  onSilentExecutionComplete: (cb) => ipcRenderer.on('silent-execution-complete', (_e, data) => cb(data)),
});
