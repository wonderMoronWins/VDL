const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Управление окном
  minimizeWindow:      () => ipcRenderer.send('window:minimize'),
  maximizeWindow:      () => ipcRenderer.send('window:maximize'),
  closeWindow:         () => ipcRenderer.send('window:close'),

  // Диалоги
  selectFolder:        () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile:          () => ipcRenderer.invoke('dialog:selectFile'),

  // Оболочка
  openPath:            (p) => ipcRenderer.invoke('shell:openPath', p),
  showItemInFolder:    (p) => ipcRenderer.invoke('shell:showItemInFolder', p),
})
