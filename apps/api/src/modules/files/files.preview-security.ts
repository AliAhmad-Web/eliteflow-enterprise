import type { Response } from "express";

/**
 * Trusted MIME values for inline preview (F-11).
 * Derived from extension — never from persisted client MIME metadata.
 * SVG intentionally excluded (stored XSS).
 */
export const SAFE_INLINE_PREVIEW_MIME_BY_EXTENSION: Readonly<
  Record<string, string>
> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/plain",
  csv: "text/plain",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export interface FileDeliveryHeaders {
  contentType: string;
  contentDisposition: string;
  /** Always true for browser sniffing protection. */
  nosniff: true;
  /** True when preview was forced to attachment. */
  forcedDownload: boolean;
}

function contentDispositionHeader(
  disposition: "inline" | "attachment",
  fileName: string,
): string {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(fileName);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Resolve Content-Type / Disposition for preview or download.
 * Preview uses an allow-list only; unsafe types are forced to download.
 */
export function resolveFileDeliveryHeaders(input: {
  mode: "preview" | "download";
  extension: string;
  fileName: string;
}): FileDeliveryHeaders {
  const extension = input.extension.toLowerCase().replace(/^\./, "");
  const safeInline = SAFE_INLINE_PREVIEW_MIME_BY_EXTENSION[extension];

  if (input.mode === "download") {
    return {
      contentType: safeInline || "application/octet-stream",
      contentDisposition: contentDispositionHeader("attachment", input.fileName),
      nosniff: true,
      forcedDownload: false,
    };
  }

  // Preview mode — SVG and non-allowlisted types never render inline.
  if (!safeInline || extension === "svg") {
    return {
      contentType: "application/octet-stream",
      contentDisposition: contentDispositionHeader("attachment", input.fileName),
      nosniff: true,
      forcedDownload: true,
    };
  }

  return {
    contentType: safeInline,
    contentDisposition: contentDispositionHeader("inline", input.fileName),
    nosniff: true,
    forcedDownload: false,
  };
}

/** Apply hardened delivery headers to an Express response. */
export function applyFileDeliveryHeaders(
  res: Response,
  headers: FileDeliveryHeaders,
  sizeBytes: number,
): void {
  res.setHeader("Content-Type", headers.contentType);
  res.setHeader("Content-Disposition", headers.contentDisposition);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Length", String(sizeBytes));
}
