import type { FileCategoryValue, ManagedFile } from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";

export function fileViewerPath(fileId: string): string {
  return `${ROUTES.FILES}/${fileId}`;
}

export function isOfficeCategory(category: FileCategoryValue): boolean {
  return (
    category === "DOCUMENT" ||
    category === "SPREADSHEET" ||
    category === "PRESENTATION"
  );
}

export function canInlinePreview(file: ManagedFile): boolean {
  if (file.previewable) return true;
  return isOfficeCategory(file.category) || file.category === "ARCHIVE";
}

export function categoryIconLabel(category: FileCategoryValue): string {
  switch (category) {
    case "IMAGE":
      return "Image";
    case "PDF":
      return "PDF";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Audio";
    case "TEXT":
      return "Text";
    case "DOCUMENT":
      return "Document";
    case "SPREADSHEET":
      return "Spreadsheet";
    case "PRESENTATION":
      return "Presentation";
    case "ARCHIVE":
      return "Archive";
    default:
      return "File";
  }
}

export function formatFileDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function guessTextLanguage(file: ManagedFile): string {
  const ext = (file.extension || "").replace(".", "").toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    scss: "css",
    html: "html",
    htm: "html",
    md: "markdown",
    py: "python",
    sql: "sql",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
    bash: "shell",
    xml: "xml",
    csv: "csv",
    txt: "text",
  };
  return map[ext] ?? "text";
}
