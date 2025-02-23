import { app, BrowserWindow, session } from "electron";
import path from "path";
import { startServer } from "./server-service";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
  app.quit();
}

class Application {
  public init(): void {
    app.on("ready", () => {
      session.defaultSession.protocol.registerFileProtocol('static', (request, callback) => {
        const fileUrl = request.url.replace('static://', '');
        // Check if it's a model file
        if (fileUrl.endsWith('.stl')) {
          const filePath = path.join('C:/Users/danie/Development/hack-ireland-team-28/.webpack/renderer/assets', fileUrl);
          callback(filePath);
        } else {
          // Handle other static files from the assets directory
          const filePath = path.join('C:/Users/danie/Development/hack-ireland-team-28/.webpack/renderer/assets', fileUrl);
          callback(filePath);
        }
      });
      
      // Start the server before creating the window
      startServer();
      this.createWindow();
    });
    app.on("window-all-closed", Application.onWindowAllClosed);
    app.on("activate", this.onActivate);
  }

  private createWindow(): void {
    const mainWindow: BrowserWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      show: true,
      frame: true,
      title: "Caddy",
      backgroundColor: "#000000",

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' http://localhost:4000;",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
            "connect-src 'self' http://localhost:4000;",
            "style-src 'self' 'unsafe-inline';",
            "img-src 'self' data: blob: http://localhost:4000;",
            "worker-src 'self' blob:;"
          ].join(' ')
        }
      });
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });


mainWindow.webContents.on('will-navigate', (event, url) => {
  // Prevent any navigation that isn’t the initial load
  console.log(`Preventing navigation to: ${url}`);
  event.preventDefault();
});

// Optionally, also block attempts to open new windows
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  console.log(`Blocking new window for: ${url}`);
  return { action: 'deny' };
});

    void mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  private onActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }

  private static onWindowAllClosed(): void {
    if (process.platform !== "darwin") {
      app.quit();
    }
  }
}

new Application().init();
