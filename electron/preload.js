const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 执行命令
    executeCommand: (projectPath, command) =>
        ipcRenderer.invoke('execute-command', { projectPath, command }),

    // 打开文件夹
    openFolder: (folderPath) =>
        ipcRenderer.invoke('open-folder', folderPath),

    // 选择文件夹
    selectFolder: () =>
        ipcRenderer.invoke('select-folder'),

    // 保存文件
    saveFile: (data, defaultName) =>
        ipcRenderer.invoke('save-file', { data, defaultName }),

    // 打开文件
    openFile: () =>
        ipcRenderer.invoke('open-file')
});

// 暴露后端 API 地址
contextBridge.exposeInMainWorld('config', {
    apiUrl: 'http://localhost:5283'
});
