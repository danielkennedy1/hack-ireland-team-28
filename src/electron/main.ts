import { app as electronApp, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import type { IpcMainInvokeEvent } from 'electron';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'index.html'));
  mainWindow.webContents.openDevTools();
}

ipcMain.handle('submit-generation', async (_event: IpcMainInvokeEvent, prompt: string) => {
  try {
    const response = await fetch('http://localhost:4000/generate-model', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    // Return a structured error that can be handled by the renderer
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

electronApp.whenReady().then(() => {
  createWindow();

  electronApp.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

electronApp.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electronApp.quit();
  }
});
