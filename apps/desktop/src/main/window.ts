import fs from "node:fs";
import path from "node:path";

import {
  BrowserWindow,
  Menu,
  app,
  shell,
  type BrowserWindowConstructorOptions,
} from "electron";
import log from "electron-log";

import {
  PRODUCTION_API_URL,
  getPreloadPath,
  getWebUrl,
  isAllowedExternalUrl,
  isAllowedNavigationUrl,
  isDev,
} from "./config";
import { getAppSession } from "./session";

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function getIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, "..", "..", "resources", "icon.png"),
    path.join(process.resourcesPath, "icon.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function createMainWindow(): BrowserWindow {
  const icon = getIconPath();

  const options: BrowserWindowConstructorOptions = {
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "EliteFlow",
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      session: getAppSession(),
      spellcheck: true,
    },
  };

  mainWindow = new BrowserWindow(options);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    } else {
      log.warn(`[window] blocked window.open: ${url}`);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAllowedNavigationUrl(url)) {
      return;
    }
    event.preventDefault();
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    log.warn(`[window] blocked navigation to ${url}`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const webUrl = getWebUrl();
  log.info(`[window] loading ${webUrl}`);
  void mainWindow.loadURL(webUrl).catch((error: unknown) => {
    log.error("[window] failed to load web app", error);
    const message = isDev()
      ? `<h1>EliteFlow Desktop</h1><p>Could not reach <code>${webUrl}</code>.</p><p>Start the web app: <code>npm run web:dev</code></p>`
      : `<h1>EliteFlow Desktop</h1><p>Could not reach the EliteFlow web application.</p><p>Check your network connection and try again.</p>`;
    void mainWindow?.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        `<!doctype html><html><body style="font-family:Segoe UI,sans-serif;padding:2rem;background:#09090b;color:#fafafa">${message}</body></html>`,
      )}`,
    );
  });

  buildApplicationMenu();

  return mainWindow;
}

function buildApplicationMenu(): void {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit", label: "Exit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev() ? [{ role: "toggleDevTools" as const }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" as const }, { role: "front" as const }]
          : [{ role: "close" as const }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open EliteFlow in Browser",
          click: () => {
            void shell.openExternal(getWebUrl());
          },
        },
        {
          label: "API Endpoint",
          click: () => {
            void shell.openExternal(PRODUCTION_API_URL);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
