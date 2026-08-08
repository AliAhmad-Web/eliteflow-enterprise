"use client";

import { useEffect, useState } from "react";

import type { ManagedFile } from "@enterprise/shared";

import { filesService } from "../../services/files.service";
import { canInlinePreview } from "./file-viewer.utils";

export type PreviewBlobState = {
  status: "idle" | "loading" | "ready" | "error" | "unsupported";
  url: string | null;
  text: string | null;
  error: string | null;
  progress: number;
};

const initial: PreviewBlobState = {
  status: "idle",
  url: null,
  text: null,
  error: null,
  progress: 0,
};

export function useFilePreviewBlob(file: ManagedFile | undefined) {
  const [state, setState] = useState<PreviewBlobState>(initial);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!file) {
        setState(initial);
        return;
      }

      if (!canInlinePreview(file) && !file.previewable) {
        setState({
          status: "unsupported",
          url: null,
          text: null,
          error: null,
          progress: 100,
        });
        return;
      }

      // Office / archive: details only unless previewable
      if (
        !file.previewable &&
        (file.category === "DOCUMENT" ||
          file.category === "SPREADSHEET" ||
          file.category === "PRESENTATION" ||
          file.category === "ARCHIVE")
      ) {
        setState({
          status: "unsupported",
          url: null,
          text: null,
          error: null,
          progress: 100,
        });
        return;
      }

      setState({
        status: "loading",
        url: null,
        text: null,
        error: null,
        progress: 15,
      });

      try {
        const blob = await filesService.downloadBlob(file.id, "preview");
        if (cancelled) return;

        setState((prev) => ({ ...prev, progress: 70 }));

        if (file.category === "TEXT") {
          const text = await blob.text();
          if (cancelled) return;
          setState({
            status: "ready",
            url: null,
            text,
            error: null,
            progress: 100,
          });
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setState({
          status: "ready",
          url: objectUrl,
          text: null,
          error: null,
          progress: 100,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          url: null,
          text: null,
          error:
            error instanceof Error ? error.message : "Could not load preview",
          progress: 100,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file?.id, file?.category, file?.previewable, file]);

  return state;
}
