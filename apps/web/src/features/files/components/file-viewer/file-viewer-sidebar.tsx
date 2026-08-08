"use client";

import type {
  FileActivityDto,
  FileShareDto,
  FileVersionDto,
  ManagedFile,
} from "@enterprise/shared";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FILE_CATEGORY_LABELS, formatBytes } from "../../types/files.types";
import { formatFileDate, isOfficeCategory } from "./file-viewer.utils";

interface FileViewerSidebarProps {
  file: ManagedFile;
  versions: FileVersionDto[];
  activities: FileActivityDto[];
  shares: FileShareDto[];
  sharesLoading?: boolean;
  canManageShares?: boolean;
  unsharePendingId?: string | null;
  onUnshare?: (shareId: string) => void;
  open: boolean;
  onClose: () => void;
}

export function FileViewerSidebar({
  file,
  versions,
  activities,
  shares,
  sharesLoading = false,
  canManageShares = false,
  unsharePendingId = null,
  onUnshare,
  open,
  onClose,
}: FileViewerSidebarProps) {
  if (!open) return null;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-t border-border/60 bg-card sm:border-l sm:border-t-0 lg:w-[320px]"
      aria-label="File details"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <Section title="File details" defaultOpen>
          <MetaRow label="Size" value={formatBytes(file.sizeBytes)} />
          <MetaRow label="Type" value={FILE_CATEGORY_LABELS[file.category]} />
          <MetaRow label="MIME" value={file.mimeType} />
          <MetaRow label="Extension" value={`.${file.extension}`} />
          <MetaRow label="Created" value={formatFileDate(file.createdAt)} />
          <MetaRow label="Modified" value={formatFileDate(file.updatedAt)} />
          <MetaRow
            label="Owner"
            value={file.createdById ? `${file.createdById.slice(0, 8)}…` : "—"}
          />
          <MetaRow label="Version" value={`v${file.version}`} />
        </Section>

        <Section title="Tags" defaultOpen={file.tags.length > 0}>
          {file.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tags</p>
          )}
        </Section>

        <Section title="Version history" defaultOpen>
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No versions</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2 text-xs"
                >
                  <p className="font-medium">v{version.version}</p>
                  <p className="text-muted-foreground">
                    {formatBytes(version.sizeBytes)} ·{" "}
                    {formatFileDate(version.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Activity timeline">
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((item) => (
                <li key={item.id} className="text-xs">
                  <p className="font-medium capitalize">
                    {item.action.toLowerCase().replaceAll("_", " ")}
                  </p>
                  <p className="text-muted-foreground">
                    {formatFileDate(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Comments">
          <p className="text-xs text-muted-foreground">
            Comments will appear here in a future release.
          </p>
        </Section>

        <Section title="Shares" defaultOpen={shares.length > 0}>
          {sharesLoading ? (
            <p className="text-xs text-muted-foreground">Loading shares…</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not shared yet</p>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => {
                const target = share.sharedWithClientId
                  ? `Client ${share.sharedWithClientId.slice(0, 8)}…`
                  : share.sharedWithUserId
                    ? `User ${share.sharedWithUserId.slice(0, 8)}…`
                    : "Unknown target";
                return (
                  <li
                    key={share.id}
                    className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{target}</p>
                        <p className="text-muted-foreground">
                          {share.access.toLowerCase()}
                          {share.expiresAt
                            ? ` · expires ${formatFileDate(share.expiresAt)}`
                            : ""}
                        </p>
                      </div>
                      {canManageShares && onUnshare ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                          isLoading={unsharePendingId === share.id}
                          disabled={Boolean(unsharePendingId)}
                          onClick={() => onUnshare(share.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Permissions">
          <p className="text-xs text-muted-foreground">
            Managed by workspace RBAC
            {file.clientId ? " · shared with client" : ""}.
          </p>
        </Section>

        <Section title="Linked records">
          <MetaRow
            label="Project"
            value={file.projectId ? `${file.projectId.slice(0, 8)}…` : "—"}
          />
          <MetaRow
            label="Client"
            value={file.clientId ? `${file.clientId.slice(0, 8)}…` : "—"}
          />
          <MetaRow
            label="Folder"
            value={file.folderId ? `${file.folderId.slice(0, 8)}…` : "Root"}
          />
        </Section>

        <Section title="Audit information">
          <MetaRow label="File ID" value={file.id} mono />
          <MetaRow label="Storage" value={file.storageProvider} />
          <MetaRow
            label="Preview"
            value={
              file.previewable
                ? "Supported"
                : isOfficeCategory(file.category)
                  ? "Office fallback"
                  : "Unavailable"
            }
          />
        </Section>

        <Section title="AI & workflows">
          <p className="text-xs text-muted-foreground">
            Ready for document summary, chat, OCR, annotations, approvals, and
            signatures — without changing this viewer shell.
          </p>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="space-y-1.5 px-1 pb-2 pt-1">{children}</div> : null}
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 break-all text-right text-foreground",
          mono && "font-mono text-[10px]",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
