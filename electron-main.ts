import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Add preload script
    }
  });

  mainWindow.loadFile(path.join(__dirname, "../index.html"));
}

// IPC handler for API requests
ipcMain.handle('submit-generation', async (_event, prompt: string) => {
  try {
    const response = await fetch('http://localhost:4000/generate-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
});

// Called when Electron finishes initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, recreate a window if the dock icon is clicked and no windows open
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
