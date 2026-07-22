import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { OpenDialogOptions } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, type StartedServer } from "@decomp-studio/server";

let apiServer: StartedServer | null = null;
let mainWindow: BrowserWindow | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createWindow(): Promise<void> {
  apiServer ??= await startServer({ port: 0, logger: false });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Decomp Studio",
    backgroundColor: "#14171b",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const devServerUrl = process.env.HACKROM_STUDIO_DEV_SERVER_URL;
  if (devServerUrl !== undefined && devServerUrl.length > 0) {
    await mainWindow.loadURL(withApiUrl(devServerUrl, apiServer.url));
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await mainWindow.loadFile(webIndexPath(), {
    query: { apiUrl: apiServer.url },
  });
}

function webIndexPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "web", "dist", "index.html");
  }
  return path.resolve(__dirname, "../../web/dist/index.html");
}

function withApiUrl(url: string, apiUrl: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("apiUrl", apiUrl);
  return parsed.toString();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("before-quit", () => {
  if (apiServer !== null) {
    void apiServer.close();
    apiServer = null;
  }
});

ipcMain.handle("project:pick-directory", async (): Promise<string | null> => {
  const options: OpenDialogOptions = {
    title: "Open pokeemerald project",
    properties: ["openDirectory"],
  };
  const result = mainWindow === null
    ? await dialog.showOpenDialog(options)
    : await dialog.showOpenDialog(mainWindow, options);
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0] ?? null;
});

await app.whenReady();

try {
  await createWindow();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await dialog.showMessageBox({
    type: "error",
    title: "Decomp Studio failed to start",
    message,
  });
  app.quit();
}
