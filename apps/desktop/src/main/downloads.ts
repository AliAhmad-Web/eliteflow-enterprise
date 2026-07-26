import path from "node:path";

import { app, session } from "electron";
import log from "electron-log";

import type {
  DesktopDownloadRequest,
  DesktopDownloadResult,
} from "../shared/types";
import { SESSION_PARTITION } from "./config";
import { getMainWindow } from "./window";

/**
 * Native download handling via Chromium session.
 * Web file downloads triggered in-page are also captured by will-download.
 */
export function attachDownloadHandlers(): void {
  const ses = session.fromPartition(SESSION_PARTITION);

  ses.on("will-download", (_event, item) => {
    const downloadsPath = app.getPath("downloads");
    const filename = item.getFilename() || "download";
    const savePath = path.join(downloadsPath, filename);
    item.setSavePath(savePath);

    item.on("updated", (_e, state) => {
      if (state === "interrupted") {
        log.warn(`[download] interrupted: ${filename}`);
      }
    });

    item.once("done", (_e, state) => {
      if (state === "completed") {
        log.info(`[download] completed: ${savePath}`);
      } else {
        log.warn(`[download] failed (${state}): ${filename}`);
      }
    });
  });
}

export function startDownload(
  request: DesktopDownloadRequest,
): Promise<DesktopDownloadResult> {
  return new Promise((resolve) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) {
      resolve({ ok: false, error: "Main window unavailable" });
      return;
    }

    const ses = session.fromPartition(SESSION_PARTITION);
    let settled = false;

    const onWillDownload = (
      _event: Electron.Event,
      item: Electron.DownloadItem,
    ) => {
      const downloadsPath = app.getPath("downloads");
      const filename =
        request.filename?.replace(/[<>:"/\\|?*]/g, "_") ||
        item.getFilename() ||
        "download";
      const savePath = path.join(downloadsPath, filename);
      item.setSavePath(savePath);

      item.once("done", (_e, state) => {
        ses.removeListener("will-download", onWillDownload);
        if (settled) {
          return;
        }
        settled = true;
        if (state === "completed") {
          resolve({ ok: true, savePath });
        } else {
          resolve({ ok: false, error: `Download ${state}` });
        }
      });
    };

    ses.on("will-download", onWillDownload);

    try {
      win.webContents.downloadURL(request.url);
    } catch (error: unknown) {
      ses.removeListener("will-download", onWillDownload);
      if (!settled) {
        settled = true;
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    setTimeout(() => {
      if (!settled) {
        settled = true;
        ses.removeListener("will-download", onWillDownload);
        resolve({ ok: false, error: "Download timed out" });
      }
    }, 120_000);
  });
}
