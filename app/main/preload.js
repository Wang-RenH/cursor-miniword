const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('themeStudio', {
  getBootstrap: () => ipcRenderer.invoke('get-bootstrap'),
  saveConfig: (patch) => ipcRenderer.invoke('save-config', patch),
  pickCursorPath: () => ipcRenderer.invoke('pick-cursor-path'),
  pickHubPath: () => ipcRenderer.invoke('pick-hub-path'),
  applyTheme: (payload) => ipcRenderer.invoke('apply-theme', payload),
  restoreOriginal: () => ipcRenderer.invoke('restore-original'),
  reenableTheme: () => ipcRenderer.invoke('reenable-theme'),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
