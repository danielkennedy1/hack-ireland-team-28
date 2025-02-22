import { app, BrowserWindow, session } from "electron";
import path from "path";

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
        const filePath = path.join(app.getAppPath(), '.webpack/renderer', fileUrl);
        callback(filePath);
      });
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
        nodeIntegration: true,
        contextIsolation: false,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
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
