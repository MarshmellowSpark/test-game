const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveToDisk: (data) => ipcRenderer.invoke('save-to-disk', data),
  loadFromDisk: () => ipcRenderer.invoke('load-from-disk'),
  exportSave: (data) => ipcRenderer.invoke('export-save', data),
  importSave: (text) => ipcRenderer.invoke('import-save', text)
});
