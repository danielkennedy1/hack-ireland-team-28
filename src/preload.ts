import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  generateModel: (prompt: string) => ipcRenderer.invoke('submit-generation', prompt)
});
