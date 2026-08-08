"use client";

import type { Folder, ManagedFile } from "@enterprise/shared";

import { filesService } from "../services/files.service";
import { buildFolderCopyName } from "./folder-actions";

async function listAllFilesInFolder(folderId: string): Promise<ManagedFile[]> {
  const items: ManagedFile[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await filesService.listFiles({
      folderId,
      search: "",
      view: "all",
      sortBy: "name",
      sortOrder: "asc",
      page,
      limit: 100,
    });
    items.push(...result.items);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function duplicateFolderRecursive(
  source: Folder,
  destParentId: string | null,
  name: string,
  onProgress?: (message: string) => void,
): Promise<Folder> {
  onProgress?.(`Creating “${name}”…`);
  const created = await filesService.createFolder({
    name,
    parentId: destParentId,
  });

  const childFolders = await filesService.listFolders({
    parentId: source.id,
    search: "",
  });

  for (const child of childFolders.items) {
    await duplicateFolderRecursive(child, created.id, child.name, onProgress);
  }

  const files = await listAllFilesInFolder(source.id);
  for (const file of files) {
    onProgress?.(`Copying “${file.name}”…`);
    const blob = await filesService.downloadBlob(file.id, "download");
    const fileObj = new File([blob], file.originalName || file.name, {
      type: file.mimeType,
    });
    await filesService.uploadFiles({
      files: [fileObj],
      folderId: created.id,
      projectId: file.projectId,
      clientId: file.clientId,
      tags: file.tags,
    });
  }

  return created;
}

/**
 * Duplicate a folder (and its contents) as a sibling using existing folder/file APIs.
 */
export async function duplicateFolderStructure(
  folder: Folder,
  onProgress?: (message: string) => void,
): Promise<Folder> {
  const siblings = await filesService.listFolders({
    parentId: folder.parentId ?? "root",
    search: "",
  });
  const copyName = buildFolderCopyName(
    folder.name,
    siblings.items.map((f) => f.name),
  );

  return duplicateFolderRecursive(
    folder,
    folder.parentId,
    copyName,
    onProgress,
  );
}
