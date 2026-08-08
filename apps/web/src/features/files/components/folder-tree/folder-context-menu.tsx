"use client";

import type { Folder } from "@enterprise/shared";
import {
  Copy,
  FolderInput,
  FolderOpen,
  Info,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FolderContextAction =
  | "open"
  | "rename"
  | "move"
  | "duplicate"
  | "copyLink"
  | "properties"
  | "delete";

interface FolderContextMenuProps {
  folder: Folder;
  canWrite: boolean;
  onAction: (action: FolderContextAction, folder: Folder) => void;
}

/**
 * Only actions backed by existing APIs (or pure client utilities) are shown.
 * Share / Download / Favorite / Permissions / Activity / Version History are
 * file-level or unsupported for folders — intentionally omitted.
 */
export function FolderContextMenu({
  folder,
  canWrite,
  onAction,
}: FolderContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Folder actions for ${folder.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={() => onAction("open", folder)}>
          <FolderOpen className="h-4 w-4" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("copyLink", folder)}>
          <Link2 className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("properties", folder)}>
          <Info className="h-4 w-4" />
          Properties
        </DropdownMenuItem>
        {canWrite ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAction("rename", folder)}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("move", folder)}>
              <FolderInput className="h-4 w-4" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("duplicate", folder)}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onAction("delete", folder)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
