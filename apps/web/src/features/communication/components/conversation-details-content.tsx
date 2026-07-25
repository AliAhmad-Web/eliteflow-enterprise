"use client";

import type {
  ConversationDto,
  ConversationMemberDto,
  MessageDto,
} from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  Hash,
  ImageIcon,
  Link2,
  LogOut,
  Pencil,
  Pin,
  PinOff,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";

import {
  useCommunicationSearch,
  useConversation,
  usePinnedMessages,
  usePresence,
} from "../hooks/use-communication";
import { useConversationMedia } from "../hooks/use-conversation-media";
import {
  useAddMembers,
  useArchiveConversation,
  useDeleteConversation,
  useRemoveMember,
  useUnarchiveConversation,
  useUnpinMessage,
  useUpdateConversation,
  useUpdateMemberRole,
} from "../hooks/use-communication-mutations";
import { communicationService } from "../services/communication.service";
import {
  COMMUNICATION_QUERY_KEYS,
  CONVERSATION_TYPE_LABELS,
  formatRelativeTime,
} from "../types/communication.types";
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationInitials,
} from "../utils/conversation-sidebar";
import { formatFileSize, getLinkPreviewMeta } from "../utils/message-content";
import { buildPresenceMap, formatLastSeen } from "../utils/presence";

type SectionId =
  | "info"
  | "members"
  | "pinned"
  | "media"
  | "files"
  | "links"
  | "search"
  | "stats";

interface ConversationDetailsContentProps {
  conversationId: string;
  currentUserId?: string;
  onClose: () => void;
  onLeft?: () => void;
  className?: string;
}

export function ConversationDetailsContent({
  conversationId,
  currentUserId,
  onClose,
  onLeft,
  className,
}: ConversationDetailsContentProps) {
  const canWrite = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const { data: conv } = useConversation(conversationId);
  const { data: pinnedData } = usePinnedMessages(conversationId, true);
  const pinnedMessages: MessageDto[] = pinnedData ?? [];

  const media = useConversationMedia(
    conversationId,
    true,
    conv?.members?.length ?? conv?.memberCount ?? 0,
    pinnedMessages.length,
  );

  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    info: true,
    members: true,
    pinned: true,
    media: true,
    files: false,
    links: false,
    search: false,
    stats: true,
  });

  const [renameOpen, setRenameOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const updateMut = useUpdateConversation(conversationId);
  const addMembersMut = useAddMembers(conversationId);
  const removeMemberMut = useRemoveMember(conversationId);
  const updateRoleMut = useUpdateMemberRole(conversationId);
  const deleteMut = useDeleteConversation();
  const archiveMut = useArchiveConversation();
  const unarchiveMut = useUnarchiveConversation();
  const unpinMut = useUnpinMessage(conversationId);

  const memberIds = useMemo(
    () => (conv?.members ?? []).map((m) => m.userId).filter(Boolean),
    [conv?.members],
  );
  const { data: presence } = usePresence(memberIds, memberIds.length > 0);
  const presenceByUserId = useMemo(() => buildPresenceMap(presence), [presence]);
  const onlineIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of presence ?? []) {
      if (row.isOnline) set.add(row.userId);
    }
    return set;
  }, [presence]);

  const myMembership = conv?.members?.find((m) => m.userId === currentUserId);
  const canManage =
    canWrite &&
    (myMembership?.role === "OWNER" || myMembership?.role === "ADMIN");
  const canDelete = canWrite && myMembership?.role === "OWNER";
  const canChangeRoles = canWrite && myMembership?.role === "OWNER";
  const isArchived = Boolean(conv?.archivedAt);

  const displayName = conv
    ? getConversationDisplayName(conv, currentUserId)
    : "Conversation";

  function toggleSection(id: SectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (!conv) {
    return (
      <div className={cn("flex h-full items-center justify-center p-6", className)}>
        <span className="text-sm text-muted-foreground">Loading details…</span>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-card", className)}>
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <Avatar className="h-12 w-12">
          {getConversationAvatarUrl(conv, currentUserId) ? (
            <AvatarImage
              src={getConversationAvatarUrl(conv, currentUserId)!}
              alt={displayName}
            />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {getConversationInitials(conv, currentUserId)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {CONVERSATION_TYPE_LABELS[conv.type]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {conv.memberCount ?? conv.members?.length ?? 0} members
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Section
          id="info"
          title="Conversation info"
          icon={Hash}
          open={openSections.info}
          onToggle={toggleSection}
        >
          {conv.description ? (
            <p className="text-xs leading-5 text-muted-foreground">{conv.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No description.</p>
          )}
          <dl className="mt-3 space-y-2 text-xs">
            <InfoRow
              icon={Calendar}
              label="Created"
              value={new Date(conv.createdAt).toLocaleString()}
            />
            <InfoRow
              icon={Calendar}
              label="Last activity"
              value={
                conv.lastMessageAt
                  ? formatRelativeTime(conv.lastMessageAt)
                  : formatRelativeTime(conv.updatedAt)
              }
            />
          </dl>
          {canManage && conv.type !== "DIRECT" ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 w-full text-xs"
              onClick={() => setRenameOpen(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Rename conversation
            </Button>
          ) : null}
        </Section>

        <Section
          id="members"
          title={`Members (${conv.members?.length ?? 0})`}
          icon={Users}
          open={openSections.members}
          onToggle={toggleSection}
          action={
            canManage ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAddMemberOpen(true)}
                title="Add members"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            ) : null
          }
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members…"
              className="h-8 pl-8 text-xs"
              aria-label="Search members"
            />
          </div>
          <ul className="space-y-2">
            {(conv.members ?? [])
              .filter((member) => {
                if (!memberSearch.trim()) return true;
                const q = memberSearch.trim().toLowerCase();
                const name = member.user
                  ? `${member.user.firstName} ${member.user.lastName}`.toLowerCase()
                  : "";
                const email = member.user?.email?.toLowerCase() ?? "";
                return name.includes(q) || email.includes(q);
              })
              .map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                isOnline={
                  onlineIds.has(member.userId) || member.isOnline === true
                }
                lastSeenLabel={formatLastSeen(
                  presenceByUserId.get(member.userId),
                )}
                canManage={canManage}
                canChangeRoles={canChangeRoles}
                onRemove={
                  canManage && member.userId !== currentUserId
                    ? () => void removeMemberMut.mutateAsync(member.userId)
                    : undefined
                }
                onRoleChange={
                  canChangeRoles && member.userId !== currentUserId
                    ? (role) =>
                        void updateRoleMut.mutateAsync({
                          userId: member.userId,
                          role,
                        })
                    : undefined
                }
              />
            ))}
          </ul>
        </Section>

        <Section
          id="pinned"
          title={`Pinned (${pinnedMessages.length})`}
          icon={Pin}
          open={openSections.pinned}
          onToggle={toggleSection}
        >
          {pinnedMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pinned messages.</p>
          ) : (
            <ul className="space-y-2">
              {pinnedMessages.map((msg) => (
                <li
                  key={msg.id}
                  className="rounded-lg border border-border bg-muted/30 p-2.5"
                >
                  <p className="line-clamp-3 text-xs text-foreground">{msg.body}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {msg.sender
                        ? `${msg.sender.firstName} ${msg.sender.lastName}`
                        : "Unknown"}{" "}
                      · {formatRelativeTime(msg.createdAt)}
                    </p>
                    {canWrite ? (
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Unpin"
                        onClick={() => void unpinMut.mutate(msg.id)}
                      >
                        <PinOff className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="media"
          title={`Media gallery (${media.images.length})`}
          icon={ImageIcon}
          open={openSections.media}
          onToggle={toggleSection}
        >
          {media.isLoading && media.images.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading media…</p>
          ) : media.images.length === 0 ? (
            <p className="text-xs text-muted-foreground">No shared images yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {media.images.slice(0, 24).map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-md border border-border bg-muted"
                  onClick={() => setLightbox(img.fileUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.fileUrl}
                    alt={img.fileName}
                    className="h-full w-full object-cover transition hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section
          id="files"
          title={`Shared files (${media.files.length})`}
          icon={FileText}
          open={openSections.files}
          onToggle={toggleSection}
        >
          {media.files.length === 0 ? (
            <p className="text-xs text-muted-foreground">No shared files yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {media.files.slice(0, 30).map((file) => (
                <li key={file.id}>
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 transition hover:bg-accent/50"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{file.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {file.mimeType || "File"}
                        {file.sizeBytes
                          ? ` · ${formatFileSize(file.sizeBytes)}`
                          : ""}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="links"
          title={`Shared links (${media.links.length})`}
          icon={Link2}
          open={openSections.links}
          onToggle={toggleSection}
        >
          {media.links.length === 0 ? (
            <p className="text-xs text-muted-foreground">No shared links yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {media.links.slice(0, 30).map((link) => {
                const meta = getLinkPreviewMeta(link.url);
                return (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-lg border border-border px-2 py-2 transition hover:bg-accent/50"
                    >
                      {meta.favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meta.favicon}
                          alt=""
                          className="mt-0.5 h-4 w-4 rounded"
                        />
                      ) : (
                        <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{meta.hostname}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {link.url}
                        </p>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section
          id="search"
          title="Search in conversation"
          icon={Search}
          open={openSections.search}
          onToggle={toggleSection}
        >
          <ConversationSearch
            conversationId={conversationId}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        </Section>

        <Section
          id="stats"
          title="Statistics"
          icon={Shield}
          open={openSections.stats}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Messages" value={media.stats.messageCount} />
            <StatCard label="Members" value={media.stats.participantCount} />
            <StatCard label="Images" value={media.stats.imageCount} />
            <StatCard label="Files" value={media.stats.fileCount} />
            <StatCard label="Links" value={media.stats.linkCount} />
            <StatCard label="Pinned" value={media.stats.pinnedCount} />
            <StatCard label="Reactions" value={media.stats.reactionCount} />
            <StatCard
              label="Unread"
              value={conv.unreadCount ?? 0}
            />
          </div>
        </Section>

        {canWrite ? (
          <div className="space-y-2 border-t border-border p-4">
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() => setAddMemberOpen(true)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Manage members
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                disabled={archiveMut.isPending || unarchiveMut.isPending}
                onClick={() => {
                  if (isArchived) {
                    void unarchiveMut.mutateAsync(conversationId);
                  } else {
                    void archiveMut.mutateAsync(conversationId);
                  }
                }}
              >
                {isArchived ? "Unarchive channel" : "Archive channel"}
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setLeaveOpen(true)}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Delete channel
              </Button>
            ) : (
              <p className="text-[11px] leading-4 text-muted-foreground">
                Only owners can delete this channel. Ask an admin if you need to
                be removed.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        conversation={conv}
        pending={updateMut.isPending}
        onSave={async (name, description) => {
          await updateMut.mutateAsync({ name, description });
          setRenameOpen(false);
        }}
      />

      <AddMembersDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        pending={addMembersMut.isPending}
        onAdd={async (memberIds, role) => {
          await addMembersMut.mutateAsync({ memberIds, role });
          setAddMemberOpen(false);
        }}
      />

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete channel?</DialogTitle>
            <DialogDescription>
              This will delete the channel for everyone. Prefer archive if you
              may need it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                void deleteMut.mutateAsync(conversationId).then(() => {
                  setLeaveOpen(false);
                  onLeft?.();
                  onClose();
                });
              }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Shared media"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  open,
  onToggle,
  action,
  children,
}: {
  id: SectionId;
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: (id: SectionId) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-accent/40"
          onClick={() => onToggle(id)}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {action}
      </div>
      {open ? <div className="px-4 pb-3">{children}</div> : null}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-xs text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  isOnline,
  lastSeenLabel,
  canManage,
  canChangeRoles,
  onRemove,
  onRoleChange,
}: {
  member: ConversationMemberDto;
  currentUserId?: string;
  isOnline: boolean;
  lastSeenLabel?: string;
  canManage?: boolean;
  canChangeRoles?: boolean;
  onRemove?: () => void;
  onRoleChange?: (role: "OWNER" | "ADMIN" | "MEMBER") => void;
}) {
  const isYou = member.userId === currentUserId;
  const name = member.user
    ? `${member.user.firstName} ${member.user.lastName}`
    : member.userId;
  const initials = `${member.user?.firstName?.[0] ?? "?"}${member.user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <li className="flex items-center gap-2.5">
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          {member.user?.avatarUrl ? (
            <AvatarImage src={member.user.avatarUrl} alt={name} />
          ) : null}
          <AvatarFallback className="text-[10px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
            isOnline ? "bg-emerald-500" : "bg-muted-foreground/35",
          )}
          title={isOnline ? "Online" : lastSeenLabel || "Offline"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">
          {name}
          {isYou ? (
            <span className="ml-1 text-muted-foreground">(you)</span>
          ) : null}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {canChangeRoles && onRoleChange ? (
            <select
              value={member.role}
              onChange={(e) =>
                onRoleChange(e.target.value as "OWNER" | "ADMIN" | "MEMBER")
              }
              className="h-5 rounded border border-input bg-background px-1 text-[9px] uppercase"
              aria-label={`Role for ${name}`}
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
            </select>
          ) : (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase">
              {member.role.toLowerCase()}
            </Badge>
          )}
          <span
            className={cn(
              "truncate text-[10px]",
              isOnline ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {isOnline ? "Active now" : lastSeenLabel || "Offline"}
          </span>
        </div>
      </div>
      {canManage && onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          Remove
        </Button>
      ) : null}
    </li>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ConversationSearch({
  conversationId,
  query,
  onQueryChange,
}: {
  conversationId: string;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const enabled = query.trim().length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: [
      ...COMMUNICATION_QUERY_KEYS.messages(conversationId),
      "search",
      query.trim(),
    ],
    queryFn: () =>
      communicationService.listMessages(conversationId, {
        page: 1,
        pageSize: 30,
        search: query.trim(),
      }),
    enabled,
  });

  const results = data?.items ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search messages…"
          className="h-8 pl-8 text-xs"
        />
      </div>
      {!enabled ? (
        <p className="text-[11px] text-muted-foreground">
          Type at least 2 characters.
        </p>
      ) : isFetching ? (
        <p className="text-[11px] text-muted-foreground">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No matches.</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {results.map((msg) => (
            <li
              key={msg.id}
              className="rounded-md border border-border bg-muted/20 px-2 py-1.5"
            >
              <p className="line-clamp-2 text-xs text-foreground">{msg.body}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {msg.sender
                  ? `${msg.sender.firstName} ${msg.sender.lastName}`
                  : "Unknown"}{" "}
                · {formatRelativeTime(msg.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  conversation,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDto;
  pending?: boolean;
  onSave: (name: string, description: string | null) => Promise<void>;
}) {
  const [name, setName] = useState(conversation.name ?? "");
  const [description, setDescription] = useState(conversation.description ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(conversation.name ?? "");
          setDescription(conversation.description ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Update the display name and description for this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Conversation name"
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || pending}
            onClick={() =>
              void onSave(name.trim(), description.trim() || null)
            }
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMembersDialog({
  open,
  onOpenChange,
  pending,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  onAdd: (
    memberIds: string[],
    role?: "OWNER" | "ADMIN" | "MEMBER",
  ) => Promise<void>;
}) {
  const [raw, setRaw] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [selected, setSelected] = useState<
    Array<{ id: string; label: string }>
  >([]);

  const { data: searchData, isFetching } = useCommunicationSearch(
    {
      q: userQuery.trim() || "a",
      scope: "users",
      page: 1,
      pageSize: 12,
    },
    open && userQuery.trim().length >= 1,
  );

  function reset() {
    setRaw("");
    setUserQuery("");
    setSelected([]);
    setRole("MEMBER");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage members</DialogTitle>
          <DialogDescription>
            Search users or paste user IDs to add them to this conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="Search users by name or email…"
          />
          {isFetching ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          {(searchData?.users ?? []).length > 0 ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {(searchData?.users ?? []).map((user) => {
                const label = `${user.firstName} ${user.lastName}`;
                const already = selected.some((s) => s.id === user.id);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      disabled={already}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                        already && "opacity-50",
                      )}
                      onClick={() =>
                        setSelected((prev) =>
                          prev.some((s) => s.id === user.id)
                            ? prev
                            : [...prev, { id: user.id, label }],
                        )
                      }
                    >
                      <span>
                        {label}
                        <span className="ml-1 text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <Input
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Or paste user IDs (comma-separated)"
          />

          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selected.map((item) => (
                <Badge key={item.id} variant="secondary" className="gap-1 text-[10px]">
                  {item.label}
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((prev) => prev.filter((s) => s.id !== item.id))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="add-member-role">
              Role for new members
            </label>
            <select
              id="add-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const fromRaw = raw
                .split(/[\s,;]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              const ids = [...new Set([...selected.map((s) => s.id), ...fromRaw])];
              if (ids.length === 0) {
                setError("Select or enter at least one user.");
                return;
              }
              setError(null);
              void onAdd(ids, role).catch((err: unknown) => {
                setError(
                  err instanceof Error ? err.message : "Failed to add members.",
                );
              });
            }}
          >
            {pending ? "Adding…" : "Add members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
