"use client";

import {
  PERMISSIONS,
  type ConversationDto,
  type ConversationTypeValue,
} from "@enterprise/shared";
import {
  Archive,
  ArchiveRestore,
  Hash,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { SoftContentSkeleton } from "@/components/common/feedback/soft-content-skeleton";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";

import { useChannels } from "../hooks/use-communication-hub";
import {
  useArchiveConversation,
  useDeleteConversation,
  useUnarchiveConversation,
  useUpdateConversation,
} from "../hooks/use-communication-mutations";
import {
  CONVERSATION_TYPE_LABELS,
  formatRelativeTime,
} from "../types/communication.types";
import { CreateChannelDialog } from "./create-channel-dialog";

const CHANNEL_TYPES = new Set<ConversationTypeValue>([
  "TEAM",
  "DEPARTMENT",
  "ORGANIZATION",
  "GROUP",
]);

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[160px]";

export function ChannelsPageContent() {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const canRead = useHasPermission(PERMISSIONS.COMMUNICATION_READ);
  const canReadChat = useHasPermission(PERMISSIONS.CHAT_READ);
  const canWrite = useHasPermission(PERMISSIONS.COMMUNICATION_WRITE);
  const canWriteChat = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const allowed = canRead || canReadChat;
  const canCreate = canWrite || canWriteChat;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [typeFilter, setTypeFilter] = useState<ConversationTypeValue | "ALL">(
    "ALL",
  );
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<ConversationDto | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<ConversationDto | null>(
    null,
  );
  const [menuId, setMenuId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      pageSize: 30,
      search: deferredSearch.trim() || undefined,
      type: typeFilter === "ALL" ? undefined : typeFilter,
      includeArchived: showArchived ? true : undefined,
      archivedOnly: showArchived ? true : undefined,
    }),
    [page, deferredSearch, typeFilter, showArchived],
  );

  const listQuery = useChannels(query, allowed);
  const showInitialLoading = listQuery.isLoading && !listQuery.data;
  const archiveMut = useArchiveConversation();
  const unarchiveMut = useUnarchiveConversation();
  const deleteMut = useDeleteConversation();

  const items = (listQuery.data?.items ?? []).filter((c) =>
    CHANNEL_TYPES.has(c.type),
  );
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  function canManageChannel(channel: ConversationDto) {
    const membership = channel.members?.find((m) => m.userId === currentUserId);
    return (
      membership?.role === "OWNER" ||
      membership?.role === "ADMIN" ||
      canWrite
    );
  }

  function canDeleteChannel(channel: ConversationDto) {
    const membership = channel.members?.find((m) => m.userId === currentUserId);
    return membership?.role === "OWNER" || canWrite;
  }

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Channels"
          description="Team, department, and organization channels."
        />
        <ErrorState
          title="Permission denied"
          description="You do not have access to channels."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-8 sm:gap-6">
      <PageHeader
        title="Channels"
        description="Browse team, department, group, and organization channels."
        actionLabel={canCreate ? "Create channel" : undefined}
        onAction={canCreate ? () => setCreateOpen(true) : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search channels…"
            className="h-10 pl-9"
            aria-label="Search channels"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="channel-type-filter">
            Filter by type
          </label>
          <select
            id="channel-type-filter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ConversationTypeValue | "ALL");
              setPage(1);
            }}
            className={selectClassName}
          >
            <option value="ALL">All types</option>
            {([...CHANNEL_TYPES] as ConversationTypeValue[]).map((t) => (
              <option key={t} value={t}>
                {CONVERSATION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            className="h-10"
            onClick={() => {
              setShowArchived((v) => !v);
              setPage(1);
            }}
          >
            {showArchived ? "Showing archived" : "Active"}
          </Button>
        </div>
      </div>

      {listQuery.isError ? (
        <ErrorState
          title="Failed to load channels"
          description="Please try again in a moment."
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {showInitialLoading ? <SoftContentSkeleton rows={6} /> : null}

      {!showInitialLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          icon={Hash}
          title={showArchived ? "No archived channels" : "No channels yet"}
          description={
            canCreate
              ? "Create a team, department, group, or organization channel to get started."
              : "Channels for teams, departments, and groups will appear here."
          }
          actionLabel={canCreate && !showArchived ? "Create channel" : undefined}
          onAction={
            canCreate && !showArchived ? () => setCreateOpen(true) : undefined
          }
        />
      ) : null}

      {!showInitialLoading && items.length > 0 ? (
        <div className="rounded-xl border border-border bg-card/40">
          <ul className="divide-y divide-border">
            {items.map((channel) => {
              const href = `${ROUTES.CHANNELS}/${channel.id}`;
              const unread = channel.unreadCount ?? 0;
              const isArchived = Boolean(channel.archivedAt);
              const manage = canManageChannel(channel);
              return (
                <li key={channel.id} className="relative">
                  <div
                    className={cn(
                      "flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                      unread > 0 && "bg-muted/20",
                    )}
                  >
                    <Link
                      href={href}
                      className="min-w-0 flex-1 transition-colors hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          # {channel.name?.trim() || "Untitled channel"}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] font-medium"
                        >
                          {CONVERSATION_TYPE_LABELS[channel.type]}
                        </Badge>
                        {isArchived ? (
                          <Badge variant="secondary" className="h-5 text-[10px]">
                            Archived
                          </Badge>
                        ) : null}
                        {unread > 0 ? (
                          <Badge className="h-5 text-[10px]">{unread}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {channel.lastMessagePreview?.trim() || "No messages yet"}
                      </p>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        {channel.memberCount ?? channel.members?.length ?? 0}
                      </span>
                      {channel.lastMessageAt ? (
                        <time dateTime={channel.lastMessageAt}>
                          {formatRelativeTime(channel.lastMessageAt)}
                        </time>
                      ) : null}
                      {manage || canDeleteChannel(channel) ? (
                        <div className="relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Channel actions"
                            onClick={() =>
                              setMenuId((id) =>
                                id === channel.id ? null : channel.id,
                              )
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {menuId === channel.id ? (
                            <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-md">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                                onClick={() => {
                                  setMenuId(null);
                                  router.push(href);
                                }}
                              >
                                Open chat
                              </button>
                              {manage ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                                  onClick={() => {
                                    setMenuId(null);
                                    setEditChannel(channel);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              ) : null}
                              {manage ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                                  disabled={
                                    archiveMut.isPending ||
                                    unarchiveMut.isPending
                                  }
                                  onClick={() => {
                                    setMenuId(null);
                                    if (isArchived) {
                                      void unarchiveMut.mutateAsync(channel.id);
                                    } else {
                                      void archiveMut.mutateAsync(channel.id);
                                    }
                                  }}
                                >
                                  {isArchived ? (
                                    <>
                                      <ArchiveRestore className="h-3.5 w-3.5" />
                                      Unarchive
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="h-3.5 w-3.5" />
                                      Archive
                                    </>
                                  )}
                                </button>
                              ) : null}
                              {canDeleteChannel(channel) ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setMenuId(null);
                                    setDeleteChannel(channel);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination?.page ?? page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <CreateChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.push(`${ROUTES.CHANNELS}/${id}`)}
      />

      <EditChannelDialog
        channel={editChannel}
        onOpenChange={(open) => {
          if (!open) setEditChannel(null);
        }}
      />

      <Dialog
        open={Boolean(deleteChannel)}
        onOpenChange={(open) => {
          if (!open) setDeleteChannel(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete channel?</DialogTitle>
            <DialogDescription>
              This permanently removes #
              {deleteChannel?.name?.trim() || "Untitled"} for everyone. Prefer
              archive if you may need it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChannel(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteChannel) return;
                void deleteMut.mutateAsync(deleteChannel.id).then(() => {
                  setDeleteChannel(null);
                });
              }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditChannelDialog({
  channel,
  onOpenChange,
}: {
  channel: ConversationDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMut = useUpdateConversation(channel?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (channel) {
      setName(channel.name ?? "");
      setDescription(channel.description ?? "");
    }
  }, [channel]);

  return (
    <Dialog open={Boolean(channel)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-channel-name">
              Name
            </label>
            <Input
              id="edit-channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="edit-channel-desc"
            >
              Description
            </label>
            <Input
              id="edit-channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={updateMut.isPending || !name.trim() || !channel}
            onClick={() => {
              if (!channel) return;
              void updateMut
                .mutateAsync({
                  name: name.trim(),
                  description: description.trim() || null,
                })
                .then(() => onOpenChange(false));
            }}
          >
            {updateMut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
