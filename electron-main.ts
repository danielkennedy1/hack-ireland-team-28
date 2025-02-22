import { app, BrowserWindow } from "electron";
import * as path from "path";

// Create a new BrowserWindow and load our index.html
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // IMPORTANT: We're loading index.html from the parent folder (not in build/)
  // so we use "../index.html" relative to compiled "build/electron-main.js"
  mainWindow.loadFile(path.join(__dirname, "../index.html"));
}

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
