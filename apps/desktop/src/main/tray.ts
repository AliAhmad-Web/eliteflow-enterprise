import path from "node:path";
import fs from "node:fs";

import { Menu, Tray, app, nativeImage } from "electron";
import log from "electron-log";

import { getMainWindow } from "./window";

let tray: Tray | null = null;

/**
 * Optional system tray support.
 * Enable with ELITEFLOW_ENABLE_TRAY=1.
 */
export function createTrayIfEnabled(): Tray | null {
  if (process.env.ELITEFLOW_ENABLE_TRAY !== "1") {
    return null;
  }

  const iconPath = path.join(__dirname, "..", "..", "resources", "icon.png");
  if (!fs.existsSync(iconPath)) {
    log.warn("[tray] icon missing; tray disabled");
    return null;
  }

  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(image);
  tray.setToolTip("EliteFlow");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show EliteFlow",
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });

  log.info("[tray] enabled");
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
