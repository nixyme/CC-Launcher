const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 项目 CRUD
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project) => ipcRenderer.invoke('add-project', project),
  updateProject: (id, updates) => ipcRenderer.invoke('update-project', { id, updates }),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  reorderProjects: (ids) => ipcRenderer.invoke('reorder-projects', ids),
  updateCommand: (projectId, index, command) =>
    ipcRenderer.invoke('update-command', { projectId, index, command }),

  // 导入/导出
  exportProjects: () => ipcRenderer.invoke('export-projects'),
  importProjects: (data) => ipcRenderer.invoke('import-projects', data),

  // 命令执行
  executeCommand: (projectPath, command) =>
    ipcRenderer.invoke('execute-command', { projectPath, command }),

  // 文件夹操作
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 文件对话框
  saveFile: (data, defaultName) => ipcRenderer.invoke('save-file', { data, defaultName }),
  openFile: () => ipcRenderer.invoke('open-file'),

  // 语言设置
  getLocale: () => ipcRenderer.invoke('get-locale'),
  setLocale: (locale) => ipcRenderer.invoke('set-locale', locale),
});
