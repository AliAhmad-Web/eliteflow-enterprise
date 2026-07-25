export const FILES_QUERY_KEYS = {
  all: ["files"] as const,
  folders: (parentId: string) =>
    [...FILES_QUERY_KEYS.all, "folders", parentId] as const,
  list: (query: unknown) => [...FILES_QUERY_KEYS.all, "list", query] as const,
  detail: (id: string) => [...FILES_QUERY_KEYS.all, "detail", id] as const,
  versions: (id: string) => [...FILES_QUERY_KEYS.all, "versions", id] as const,
  activity: (id: string) => [...FILES_QUERY_KEYS.all, "activity", id] as const,
  shares: (id: string) => [...FILES_QUERY_KEYS.all, "shares", id] as const,
};

export const FILE_CATEGORY_LABELS = {
  IMAGE: "Images",
  PDF: "PDF",
  DOCUMENT: "Documents",
  SPREADSHEET: "Spreadsheets",
  PRESENTATION: "Presentations",
  ARCHIVE: "Archives",
  TEXT: "Text",
  VIDEO: "Video",
  AUDIO: "Audio",
  OTHER: "Other",
} as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
