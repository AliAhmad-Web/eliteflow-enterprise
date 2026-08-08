"use client";

import type { Folder } from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";

import { filesService } from "../services/files.service";

const INVALID_FOLDER_NAME = /[\\/:*?"<>|]/;

export function validateFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Folder name is required.";
  if (trimmed.length > 200) return "Folder name must be 200 characters or fewer.";
  if (INVALID_FOLDER_NAME.test(trimmed)) {
    return 'Name cannot contain \\ / : * ? " < > |';
  }
  if (trimmed === "." || trimmed === "..") {
    return "Invalid folder name.";
  }
  return null;
}

export function buildFolderCopyName(
  baseName: string,
  siblingNames: string[],
): string {
  const existing = new Set(siblingNames.map((n) => n.toLowerCase()));
  if (!existing.has(baseName.toLowerCase())) return baseName;

  const copy1 = `${baseName} (Copy)`;
  if (!existing.has(copy1.toLowerCase())) return copy1;

  let i = 2;
  while (existing.has(`${baseName} (Copy ${i})`.toLowerCase())) {
    i += 1;
  }
  return `${baseName} (Copy ${i})`;
}

export async function listSiblingFolderNames(
  parentId: string | null,
): Promise<string[]> {
  const result = await filesService.listFolders({
    parentId: parentId ?? "root",
    search: "",
  });
  return result.items.map((f) => f.name);
}

/** Collect folder id + all descendant ids (for move circular checks). */
export async function collectDescendantFolderIds(
  folderId: string,
): Promise<Set<string>> {
  const blocked = new Set<string>([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { items } = await filesService.listFolders({
      parentId: current,
      search: "",
    });
    for (const child of items) {
      if (!blocked.has(child.id)) {
        blocked.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return blocked;
}

export function folderDeepLink(folderId: string): string {
  if (typeof window === "undefined") {
    return `${ROUTES.FILE_MANAGER}?folder=${encodeURIComponent(folderId)}`;
  }
  const url = new URL(ROUTES.FILE_MANAGER, window.location.origin);
  url.searchParams.set("folder", folderId);
  return url.toString();
}

export function formatFolderPath(
  folder: Folder,
  getParent: (id: string) => Folder | null,
): string {
  const parts: string[] = [folder.name];
  let current: string | null = folder.parentId;
  const guard = new Set<string>();
  while (current && !guard.has(current)) {
    guard.add(current);
    const parent = getParent(current);
    if (!parent) {
      parts.unshift("…");
      break;
    }
    parts.unshift(parent.name);
    current = parent.parentId;
  }
  return ["Home", ...parts].join(" › ");
}
