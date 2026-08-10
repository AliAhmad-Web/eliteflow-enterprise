"use client";

import type { MessageDto } from "@enterprise/shared";
import { FILES_API_PREFIX, PERMISSIONS } from "@enterprise/shared";
import {
  AtSign,
  Bold,
  Code2,
  Command,
  FileCode2,
  ImageIcon,
  Italic,
  Link2,
  List,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useEffectEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { aiService } from "@/features/ai/services/ai.service";
import { filesService } from "@/features/files/services/files.service";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/services/api/api-error";

import {
  useSendMessage,
  useUpdateMessage,
} from "../hooks/use-communication-mutations";
import {
  clearComposerDraft,
  loadComposerDraft,
  saveComposerDraft,
} from "../utils/composer-draft";
import {
  displayifyMentions,
  encodeDisplayMentionsForStorage,
  extractMentionUserIdsFromBody,
  formatMentionLabel,
} from "../utils/mentions";
import {
  encodeLinkMarkers,
  stripLinkMarkers,
  type LinkedRecordRef,
} from "../utils/message-linked-records";
import { EmojiPicker } from "./emoji-picker";
import { LinkRecordPicker } from "./link-record-picker";

const MAX_CHARS = 10_000;

type MemberSuggestion = { id: string; firstName: string; lastName: string };

type AttachmentDraft = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  managedFileId?: string;
  previewUrl?: string;
  uploading?: boolean;
};

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  insert?: string;
  action?: "ai" | "gif" | "codeblock" | "clear";
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "code",
    label: "/code",
    description: "Insert a fenced code block",
    action: "codeblock",
  },
  {
    id: "bold",
    label: "/bold",
    description: "Wrap selection in **bold**",
    insert: "**bold**",
  },
  {
    id: "italic",
    label: "/italic",
    description: "Wrap selection in _italic_",
    insert: "_italic_",
  },
  {
    id: "link",
    label: "/link",
    description: "Insert a markdown link",
    insert: "[label](https://)",
  },
  {
    id: "list",
    label: "/list",
    description: "Start a bullet list",
    insert: "- item\n- item\n- item",
  },
  {
    id: "ai",
    label: "/ai",
    description: "Improve draft with AI Assist",
    action: "ai",
  },
  {
    id: "gif",
    label: "/gif",
    description: "Open GIF picker (coming soon)",
    action: "gif",
  },
  {
    id: "clear",
    label: "/clear",
    description: "Clear the composer draft",
    action: "clear",
  },
];

interface ComposerProps {
  conversationId: string;
  replyTo?: MessageDto | null;
  onClearReply?: () => void;
  editingMessage?: MessageDto | null;
  onCancelEdit?: () => void;
  onEdited?: () => void;
  memberSuggestions?: MemberSuggestion[];
  onTyping?: (isTyping: boolean) => void;
  onSent?: () => void;
  /** Prepended quote markdown; consumed once after apply. */
  pendingQuote?: string | null;
  pendingQuoteKey?: string | null;
  onConsumeQuote?: () => void;
}

export function MessageComposer({
  conversationId,
  replyTo,
  onClearReply,
  editingMessage,
  onCancelEdit,
  onEdited,
  memberSuggestions = [],
  onTyping,
  onSent,
  pendingQuote,
  pendingQuoteKey,
  onConsumeQuote,
}: ComposerProps) {
  const canWrite = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const canUpload = useHasPermission(PERMISSIONS.FILES_UPLOAD);
  const canUseAi = useHasPermission(PERMISSIONS.AI_USE);

  const sendMut = useSendMessage(conversationId);
  const updateMut = useUpdateMessage(conversationId);

  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPlaceholder, setShowGifPlaceholder] = useState(false);
  const [showVoicePlaceholder, setShowVoicePlaceholder] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecordRef[]>([]);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDepthRef = useRef(0);

  const isEditing = Boolean(editingMessage);
  const lastConversationIdRef = useRef<string | null>(null);

  const onConversationChange = useEffectEvent((id: string) => {
    const draft = loadComposerDraft(id);
    setBody(draft?.body ?? "");
    setDraftSavedAt(draft?.updatedAt ?? null);
    setAttachments([]);
    setError(null);
    setShowEmoji(false);
    setShowGifPlaceholder(false);
    setShowVoicePlaceholder(false);
    setMentionQuery(null);
    setSlashQuery(null);
    setLinkedRecords([]);
    setLinkPickerOpen(false);
  });

  useEffect(() => {
    // Only reset when the conversation actually changes — do not list
    // useEffectEvent in deps (its identity is not a sync dependency).
    if (lastConversationIdRef.current === conversationId) return;
    lastConversationIdRef.current = conversationId;
    onConversationChange(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!editingMessage) return;
    setBody(stripLinkMarkers(displayifyMentions(editingMessage.body)));
    setAttachments([]);
    setError(null);
    textareaRef.current?.focus();
    // Intentionally keyed by message id so object identity churn cannot loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [editingMessage?.id]);

  const consumeQuote = useEffectEvent(() => {
    onConsumeQuote?.();
  });

  useEffect(() => {
    if (!pendingQuote || !pendingQuoteKey) return;
    const quoteText = pendingQuote;
    setBody((prev) => `${quoteText}${prev}`);
    consumeQuote();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = quoteText.length;
      el.setSelectionRange(pos, pos);
    });
  }, [pendingQuoteKey, pendingQuote]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [body]);

  useEffect(() => {
    if (isEditing) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveComposerDraft(conversationId, body);
      setDraftSavedAt(body.trim() ? new Date().toISOString() : null);
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [body, conversationId, isEditing]);

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return memberSuggestions
      .filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [mentionQuery, memberSuggestions]);

  const filteredSlash = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.label.slice(1).startsWith(q) ||
        cmd.description.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [slashQuery]);

  function emitTyping() {
    if (!onTyping) return;
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTyping(false), 2500);
  }

  function updateBodyFromTextarea(value: string, cursor: number) {
    setBody(value);
    setError(null);
    emitTyping();

    const slice = value.slice(0, cursor);
    const atIdx = slice.lastIndexOf("@");
    const slashIdx = slice.lastIndexOf("/");

    if (
      atIdx !== -1 &&
      (atIdx === 0 || /\s/.test(slice[atIdx - 1] ?? "")) &&
      !slice.slice(atIdx + 1).includes(" ")
    ) {
      setMentionQuery(slice.slice(atIdx + 1));
      setMentionAnchor(atIdx);
      setMentionIndex(0);
      setSlashQuery(null);
      return;
    }

    setMentionQuery(null);

    if (
      slashIdx !== -1 &&
      (slashIdx === 0 || /\s/.test(slice[slashIdx - 1] ?? "")) &&
      !slice.slice(slashIdx + 1).includes(" ")
    ) {
      setSlashQuery(slice.slice(slashIdx + 1));
      setSlashIndex(0);
      return;
    }

    setSlashQuery(null);
  }

  function replaceRange(start: number, end: number, text: string) {
    const next = `${body.slice(0, start)}${text}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = start + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function wrapSelection(prefix: string, suffix = prefix, placeholder = "text") {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => `${prev}${prefix}${placeholder}${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    replaceRange(start, end, `${prefix}${selected}${suffix}`);
  }

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + text);
      return;
    }
    replaceRange(el.selectionStart, el.selectionEnd, text);
  }

  function insertMention(user: MemberSuggestion) {
    const label = formatMentionLabel(user, memberSuggestions);
    const token = `@${label} `;
    const queryLen = mentionQuery?.length ?? 0;
    replaceRange(mentionAnchor, mentionAnchor + 1 + queryLen, token);
    setMentionQuery(null);
  }

  function runSlashCommand(cmd: SlashCommand) {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? body.length;
    const slice = body.slice(0, cursor);
    const slashIdx = slice.lastIndexOf("/");
    const before = slashIdx >= 0 ? body.slice(0, slashIdx) : body.slice(0, cursor);
    const after = slashIdx >= 0 ? body.slice(cursor) : body.slice(cursor);

    setSlashQuery(null);

    switch (cmd.action) {
      case "ai":
        setBody(before + after);
        void runAiAssist(before + after);
        return;
      case "gif":
        setBody(before + after);
        setShowGifPlaceholder(true);
        setShowVoicePlaceholder(false);
        setShowEmoji(false);
        return;
      case "clear":
        setBody("");
        setAttachments([]);
        clearComposerDraft(conversationId);
        setDraftSavedAt(null);
        return;
      case "codeblock":
        setBody(`${before}\`\`\`ts\n// code\n\`\`\`\n${after}`);
        return;
      default:
        setBody(`${before}${cmd.insert ?? ""}${after}`);
    }
  }

  async function runAiAssist(source = body) {
    if (!canUseAi) {
      setError("AI Assist requires ai:use permission.");
      return;
    }
    const draft = source.trim();
    if (!draft) {
      setError("Write a draft first, then use AI Assist.");
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      let improved = "";
      await aiService.chatStream(
        {
          message: `Rewrite this chat message to be clearer and more professional. Return ONLY the improved message text, no quotes or explanation.\n\n${draft}`,
          mode: "ASK",
        },
        {
          onDelta: (chunk) => {
            improved += chunk;
            setBody(improved.trim());
          },
        },
      );
      if (improved.trim()) setBody(improved.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI Assist failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function ingestFiles(fileList: FileList | File[]) {
    const files = [...fileList];
    if (files.length === 0) return;
    setError(null);

    for (const file of files) {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        {
          id: localId,
          fileName: file.name,
          fileUrl: previewUrl,
          mimeType: file.type,
          sizeBytes: file.size,
          previewUrl,
          uploading: true,
        },
      ]);

      try {
        let fileUrl = previewUrl;
        let managedFileId: string | undefined;

        if (canUpload) {
          try {
            const uploaded = await filesService.uploadFiles({ files: [file] });
            const managed = uploaded[0];
            if (managed) {
              managedFileId = managed.id;
              fileUrl = `${getApiBaseUrl()}${FILES_API_PREFIX}/${managed.id}/download`;
            }
          } catch (err) {
            throw err instanceof Error ? err : new Error("Upload failed.");
          }
        }

        if (!managedFileId) {
          throw new Error(
            canUpload
              ? `Upload failed for ${file.name}.`
              : `${file.name} requires File Manager upload permission.`,
          );
        }

        setAttachments((prev) =>
          prev.map((att) =>
            att.id === localId
              ? {
                  ...att,
                  fileUrl,
                  managedFileId,
                  uploading: false,
                }
              : att,
          ),
        );
      } catch (err) {
        setAttachments((prev) => prev.filter((att) => att.id !== localId));
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    }
  }

  async function handleSubmit() {
    if (!canWrite) return;
    const trimmed = body.trim();
    if (!trimmed && attachments.length === 0) return;
    if (trimmed.length > MAX_CHARS) {
      setError(`Message exceeds ${MAX_CHARS.toLocaleString()} characters.`);
      return;
    }
    if (attachments.some((att) => att.uploading)) {
      setError("Wait for uploads to finish.");
      return;
    }

    setSendPulse(true);
    setError(null);

    try {
      if (isEditing && editingMessage) {
        const storedBody = encodeDisplayMentionsForStorage(
          trimmed,
          memberSuggestions,
        );
        await updateMut.mutateAsync({
          messageId: editingMessage.id,
          input: { body: storedBody },
        });
        onCancelEdit?.();
        onEdited?.();
      } else {
        const textBody =
          trimmed || (attachments.length ? "Shared an attachment" : "");
        const withLinks = `${encodeLinkMarkers(linkedRecords)}${textBody}`;
        const storedBody = encodeDisplayMentionsForStorage(
          withLinks,
          memberSuggestions,
        );
        const mentionUserIds = [
          ...new Set([
            ...extractMentionUserIdsFromBody(storedBody),
            ...memberSuggestions
              .filter((m) => {
                const label = formatMentionLabel(m, memberSuggestions);
                return (
                  trimmed.includes(`@${label}`) ||
                  body.includes(`@${m.firstName}${m.lastName}`)
                );
              })
              .map((m) => m.id),
          ]),
        ];

        await sendMut.mutateAsync({
          kind: "TEXT",
          body: storedBody,
          parentId: replyTo?.id ?? null,
          mentionUserIds: mentionUserIds.length ? mentionUserIds : undefined,
          attachments: attachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            managedFileId: att.managedFileId,
          })),
        });
        onClearReply?.();
        onSent?.();
      }

      setBody("");
      setAttachments([]);
      setLinkedRecords([]);
      setLinkPickerOpen(false);
      clearComposerDraft(conversationId);
      setDraftSavedAt(null);
      setShowEmoji(false);
      setShowGifPlaceholder(false);
      setShowVoicePlaceholder(false);
      onTyping?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      window.setTimeout(() => setSendPulse(false), 450);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (filteredMentions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + filteredMentions.length) % filteredMentions.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const user = filteredMentions[mentionIndex];
        if (user) insertMention(user);
        return;
      }
    }

    if (filteredSlash.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredSlash.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex(
          (i) => (i - 1 + filteredSlash.length) % filteredSlash.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const cmd = filteredSlash[slashIndex];
        if (cmd) runSlashCommand(cmd);
        return;
      }
    }

    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapSelection("**");
      return;
    }
    if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapSelection("_");
      return;
    }
    if (mod && event.key.toLowerCase() === "e") {
      event.preventDefault();
      wrapSelection("`");
      return;
    }
    if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      wrapSelection("```\n", "\n```", "code");
      return;
    }
    if (mod && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
      return;
    }

    if (event.key === "Escape") {
      setMentionQuery(null);
      setSlashQuery(null);
      setShowEmoji(false);
      if (isEditing) onCancelEdit?.();
      else if (replyTo) onClearReply?.();
    }
  }

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setDragging(false);
      if (event.dataTransfer.files?.length) {
        void ingestFiles(event.dataTransfer.files);
      }
    },
    // ingestFiles closes over state setters; stable enough for drop handling
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpload],
  );

  if (!canWrite) return null;

  const remaining = MAX_CHARS - body.length;
  const busy = sendMut.isPending || updateMut.isPending || aiBusy;
  const canSubmit =
    (body.trim().length > 0 ||
      attachments.length > 0 ||
      linkedRecords.length > 0) &&
    !attachments.some((a) => a.uploading) &&
    !busy &&
    remaining >= 0;

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className="relative border-t border-border bg-card/40 px-3 pb-3 pt-2 backdrop-blur-sm"
        onDragEnter={onDragEnter}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {replyTo && !isEditing ? (
          <ModeBanner
            title={`Replying to ${replyTo.sender?.firstName ?? "someone"}`}
            body={stripLinkMarkers(displayifyMentions(replyTo.body))}
            onClose={() => onClearReply?.()}
          />
        ) : null}

        {isEditing && editingMessage ? (
          <ModeBanner
            title="Editing message"
            body={stripLinkMarkers(displayifyMentions(editingMessage.body))}
            tone="warning"
            onClose={() => onCancelEdit?.()}
          />
        ) : null}

        {!isEditing ? (
          <LinkRecordPicker
            selected={linkedRecords}
            onChange={setLinkedRecords}
            open={linkPickerOpen}
            onOpenChange={setLinkPickerOpen}
          />
        ) : null}

        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5"
              >
                {att.mimeType?.startsWith("image/") && att.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.previewUrl}
                    alt={att.fileName}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="max-w-35 truncate text-xs font-medium">
                    {att.fileName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {att.uploading
                      ? "Uploading…"
                      : att.sizeBytes
                        ? `${Math.max(1, Math.round(att.sizeBytes / 1024))} KB`
                        : "Ready"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {filteredMentions.length > 0 ? (
          <div className="absolute bottom-full left-3 z-20 mb-1 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            {filteredMentions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  index === mentionIndex ? "bg-accent" : "hover:bg-accent/60",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(user);
                }}
              >
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    @{formatMentionLabel(user, memberSuggestions)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {filteredSlash.length > 0 ? (
          <div className="absolute bottom-full left-3 z-20 mb-1 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            {filteredSlash.map((cmd, index) => (
              <button
                key={cmd.id}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left",
                  index === slashIndex ? "bg-accent" : "hover:bg-accent/60",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSlashCommand(cmd);
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Command className="h-3.5 w-3.5 text-muted-foreground" />
                  {cmd.label}
                </span>
                <span className="pl-5 text-[11px] text-muted-foreground">
                  {cmd.description}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {showEmoji ? (
          <div className="absolute bottom-full left-3 z-20 mb-1">
            <EmojiPicker
              onSelect={(emoji) => {
                insertAtCursor(emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        ) : null}

        {showGifPlaceholder ? (
          <PlaceholderPanel
            title="GIFs coming soon"
            description="GIF search will connect to your approved media provider. Use image upload for now."
            onClose={() => setShowGifPlaceholder(false)}
          />
        ) : null}

        {showVoicePlaceholder ? (
          <PlaceholderPanel
            title="Voice messages coming soon"
            description="Recording UI is ready for integration. Click the mic again to dismiss."
            onClose={() => setShowVoicePlaceholder(false)}
          />
        ) : null}

        <div
          className={cn(
            "relative rounded-2xl border bg-background transition-all duration-200",
            dragging
              ? "border-primary border-dashed bg-primary/5 shadow-md"
              : "border-input focus-within:ring-1 focus-within:ring-ring",
          )}
        >
          {dragging ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary/5 text-sm font-medium text-primary">
              Drop files to attach
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-2 py-1.5">
            <ToolbarIcon
              label="Emoji"
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowGifPlaceholder(false);
                setShowVoicePlaceholder(false);
              }}
            >
              <Smile className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="Mention"
              onClick={() => insertAtCursor("@")}
            >
              <AtSign className="h-4 w-4" />
            </ToolbarIcon>
            {!isEditing ? (
              <ToolbarIcon
                label="Link ERP record"
                onClick={() => setLinkPickerOpen((value) => !value)}
              >
                <Link2 className="h-4 w-4" />
              </ToolbarIcon>
            ) : null}
            <ToolbarIcon label="Bold (Ctrl+B)" onClick={() => wrapSelection("**")}>
              <Bold className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon label="Italic (Ctrl+I)" onClick={() => wrapSelection("_")}>
              <Italic className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon label="Inline code (Ctrl+E)" onClick={() => wrapSelection("`")}>
              <Code2 className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="Code block (Ctrl+Shift+C)"
              onClick={() => wrapSelection("```\n", "\n```", "code")}
            >
              <FileCode2 className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="Link"
              onClick={() => wrapSelection("[", "](https://)", "label")}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="List"
              onClick={() => insertAtCursor("- item\n- item\n")}
            >
              <List className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="GIF"
              onClick={() => {
                setShowGifPlaceholder((v) => !v);
                setShowEmoji(false);
                setShowVoicePlaceholder(false);
              }}
            >
              <ImageIcon className="h-4 w-4" />
            </ToolbarIcon>
            <ToolbarIcon
              label="Voice message"
              onClick={() => {
                setShowVoicePlaceholder((v) => !v);
                setShowEmoji(false);
                setShowGifPlaceholder(false);
              }}
            >
              <Mic className="h-4 w-4" />
            </ToolbarIcon>
            <div className="ml-auto">
              <ToolbarIcon
                label={canUseAi ? "AI Assist" : "AI Assist (permission required)"}
                onClick={() => void runAiAssist()}
                disabled={!canUseAi || aiBusy}
              >
                {aiBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </ToolbarIcon>
            </div>
          </div>

          <div className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={body}
              onChange={(event) =>
                updateBodyFromTextarea(
                  event.target.value,
                  event.target.selectionStart,
                )
              }
              onKeyDown={handleKeyDown}
              placeholder={
                isEditing
                  ? "Edit your message… Markdown supported"
                  : "Message…  / for commands · @ to mention · Enter to send"
              }
              className="min-h-7 max-h-45 flex-1 resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0 transition-transform duration-200",
                sendPulse && "scale-90",
                canSubmit && "shadow-sm",
              )}
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              aria-label={isEditing ? "Save edit" : "Send message"}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    sendPulse && "-rotate-12 translate-x-0.5 -translate-y-0.5",
                  )}
                />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
            <p className="truncate">
              <span className="hidden sm:inline">
                Enter send · Shift+Enter newline · Ctrl+B/I/E markdown
                {draftSavedAt && !isEditing ? " · Draft saved" : ""}
              </span>
              <span className="sm:hidden">Enter to send · Draft autosave</span>
            </p>
            <p
              className={cn(
                "tabular-nums",
                remaining < 200 && "text-amber-600",
                remaining < 0 && "font-semibold text-destructive",
              )}
            >
              {body.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void ingestFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function ModeBanner({
  title,
  body,
  onClose,
  tone = "primary",
}: {
  title: string;
  body: string;
  onClose: () => void;
  tone?: "primary" | "warning";
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-stretch gap-2 rounded-xl border px-2.5 py-2",
        tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-border bg-muted/40",
      )}
    >
      <span
        className={cn(
          "w-0.5 shrink-0 rounded-full",
          tone === "warning" ? "bg-amber-500" : "bg-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[11px] font-semibold",
            tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-primary",
          )}
        >
          {title}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 self-start rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PlaceholderPanel({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full left-3 z-20 mb-1 w-80 rounded-xl border border-border bg-popover p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ToolbarIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground",
            disabled && "cursor-not-allowed opacity-40",
          )}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
