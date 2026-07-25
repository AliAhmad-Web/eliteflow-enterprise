"use client";

import type { CommunicationSearchQueryInput } from "@enterprise/shared";
import { ROUTES } from "@/constants/routes";
import {
  Building2,
  FolderKanban,
  Hash,
  MessageSquareText,
  Paperclip,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildLinkedRecordDeepLink, stripLinkMarkers } from "../utils/message-linked-records";
import { displayifyMentions } from "../utils/mentions";
import { useCommunicationSearch } from "../hooks/use-communication";
import { SearchResultsSkeleton } from "./communication-skeletons";

type SearchScope = CommunicationSearchQueryInput["scope"];

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  memberOptions: Array<{ id: string; label: string }>;
  onOpenConversation: (conversationId: string, messageId?: string) => void;
}

const SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: "all", label: "All" },
  { id: "messages", label: "Messages" },
  { id: "conversations", label: "Conversations" },
  { id: "attachments", label: "Attachments" },
  { id: "users", label: "Users" },
  { id: "projects", label: "Projects" },
  { id: "clients", label: "Clients" },
];

export function GlobalSearchDialog({
  open,
  onOpenChange,
  currentUserId,
  memberOptions,
  onOpenConversation,
}: GlobalSearchDialogProps) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [userId, setUserId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [hasMention, setHasMention] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const query = useMemo((): CommunicationSearchQueryInput => {
    const payload: CommunicationSearchQueryInput = {
      q: debouncedQ,
      scope,
      page: 1,
      pageSize: 20,
    };
    if (userId) payload.userId = userId;
    if (fromDate) payload.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
    if (toDate) payload.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();
    if (hasAttachment) payload.hasAttachment = true;
    if (hasMention) payload.hasMention = true;
    if (isPinned) payload.isPinned = true;
    return payload;
  }, [
    debouncedQ,
    scope,
    userId,
    fromDate,
    toDate,
    hasAttachment,
    hasMention,
    isPinned,
  ]);

  const hasFilter =
    Boolean(userId) ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    hasAttachment ||
    hasMention ||
    isPinned;

  const enabled = open && (Boolean(debouncedQ) || hasFilter);
  const { data, isFetching, isError, error } = useCommunicationSearch(
    query,
    enabled,
  );

  const totalHits =
    (data?.conversations.length ?? 0) +
    (data?.messages.length ?? 0) +
    (data?.attachments.length ?? 0) +
    (data?.users.length ?? 0) +
    (data?.projects.length ?? 0) +
    (data?.clients.length ?? 0);

  function clearFilters() {
    setUserId("");
    setFromDate("");
    setToDate("");
    setHasAttachment(false);
    setHasMention(false);
    setIsPinned(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm font-semibold">
            Search workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search messages, people, files, projects…"
              className="h-10 pl-9"
              aria-label="Search workspace"
            />
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Search scope"
          >
            {SCOPES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={scope === item.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
                  scope === item.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                onClick={() => setScope(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={showFilters || hasFilter}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
                showFilters || hasFilter
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
              onClick={() => setShowFilters((value) => !value)}
            >
              Filters{hasFilter ? " •" : ""}
            </button>
          </div>

          {showFilters ? (
            <div className="grid gap-2 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
              <label className="space-y-1 text-[11px] text-muted-foreground">
                From date
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-8 bg-background text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                To date
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-8 bg-background text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground sm:col-span-2">
                User
                <select
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Anyone</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
                      {member.id === currentUserId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <FilterChip
                  active={hasAttachment}
                  onClick={() => setHasAttachment((value) => !value)}
                  label="Has attachment"
                />
                <FilterChip
                  active={hasMention}
                  onClick={() => setHasMention((value) => !value)}
                  label="Has mention"
                />
                <FilterChip
                  active={isPinned}
                  onClick={() => setIsPinned((value) => !value)}
                  label="Pinned"
                />
                {hasFilter ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={clearFilters}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
          role="region"
          aria-live="polite"
          aria-label="Search results"
        >
          {!enabled ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Start typing or apply a filter to search across EliteFlow.
            </p>
          ) : isFetching ? (
            <SearchResultsSkeleton />
          ) : isError ? (
            <p className="px-3 py-8 text-center text-sm text-destructive" role="alert">
              {error instanceof Error ? error.message : "Search failed"}
            </p>
          ) : totalHits === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found. Try a broader query or clear filters.
            </p>
          ) : (
            <div className="space-y-3 pb-2">
              {(scope === "all" || scope === "conversations") &&
              (data?.conversations.length ?? 0) > 0 ? (
                <ResultSection title="Conversations" icon={Hash}>
                  {data!.conversations.map((conversation) => (
                    <ResultButton
                      key={conversation.id}
                      title={conversation.name ?? "Conversation"}
                      subtitle={
                        stripLinkMarkers(
                          displayifyMentions(
                            conversation.lastMessagePreview ?? "",
                          ),
                        ) || conversation.type
                      }
                      onClick={() => {
                        onOpenConversation(conversation.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {(scope === "all" || scope === "messages") &&
              (data?.messages.length ?? 0) > 0 ? (
                <ResultSection title="Messages" icon={MessageSquareText}>
                  {data!.messages.map((message) => (
                    <ResultButton
                      key={message.id}
                      title={
                        message.sender
                          ? `${message.sender.firstName} ${message.sender.lastName}`
                          : "Message"
                      }
                      subtitle={stripLinkMarkers(
                        displayifyMentions(message.body),
                      )}
                      onClick={() => {
                        onOpenConversation(message.conversationId, message.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {(scope === "all" || scope === "attachments") &&
              (data?.attachments.length ?? 0) > 0 ? (
                <ResultSection title="Attachments" icon={Paperclip}>
                  {data!.attachments.map((attachment) => (
                    <ResultButton
                      key={attachment.id}
                      title={attachment.fileName}
                      subtitle={attachment.mimeType ?? "File"}
                      onClick={() => {
                        onOpenConversation(
                          attachment.conversationId,
                          attachment.messageId,
                        );
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {(scope === "all" || scope === "users") &&
              (data?.users.length ?? 0) > 0 ? (
                <ResultSection title="Users" icon={UserRound}>
                  {data!.users.map((user) => (
                    <ResultButton
                      key={user.id}
                      title={`${user.firstName} ${user.lastName}`}
                      subtitle={user.email}
                      href={`${ROUTES.TEAM}?open=${user.id}`}
                      onNavigate={() => onOpenChange(false)}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {(scope === "all" || scope === "projects") &&
              (data?.projects.length ?? 0) > 0 ? (
                <ResultSection title="Projects" icon={FolderKanban}>
                  {data!.projects.map((project) => (
                    <ResultButton
                      key={project.id}
                      title={project.name}
                      subtitle={project.status}
                      href={buildLinkedRecordDeepLink("PROJECT", project.id)}
                      onNavigate={() => onOpenChange(false)}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {(scope === "all" || scope === "clients") &&
              (data?.clients.length ?? 0) > 0 ? (
                <ResultSection title="Clients" icon={Building2}>
                  {data!.clients.map((client) => (
                    <ResultButton
                      key={client.id}
                      title={client.companyName}
                      subtitle={client.status}
                      href={buildLinkedRecordDeepLink("CLIENT", client.id)}
                      onNavigate={() => onOpenChange(false)}
                    />
                  ))}
                </ResultSection>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function ResultSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Search;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function ResultButton({
  title,
  subtitle,
  onClick,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  onNavigate?: () => void;
}) {
  const className =
    "flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

  if (href) {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        <span className="truncate text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="line-clamp-2 text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <span className="truncate text-sm font-medium text-foreground">
        {title}
      </span>
      <span className="line-clamp-2 text-[11px] text-muted-foreground">
        {subtitle}
      </span>
    </button>
  );
}
