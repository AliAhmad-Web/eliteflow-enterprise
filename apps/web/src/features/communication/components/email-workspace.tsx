"use client";

import type { EmployeeProfile, Notification, Team } from "@enterprise/shared";
import {
  Archive,
  Check,
  ChevronDown,
  Forward,
  Inbox,
  Languages,
  Loader2,
  Mail,
  Mic,
  MoreHorizontal,
  Paperclip,
  PenSquare,
  Reply,
  ReplyAll,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  useCreateNotification,
  useMarkNotificationRead,
  useProcessNotificationQueue,
} from "@/features/notifications/hooks/use-notifications-mutations";
import {
  useNotificationQueue,
  useNotifications,
  useNotificationTemplates,
} from "@/features/notifications/hooks/use-notifications";
import { notificationsService } from "@/features/notifications/services/notifications.service";
import { formatRelativeTime } from "@/features/notifications/types/notifications.types";
import { useDepartments, useEmployees, useTeams } from "@/features/team/hooks/use-team";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  isCommunicationEmailAiEnabled,
  isCommunicationEmailEnterpriseUiEnabled,
  isCommunicationEmailScheduleEnabled,
  isCommunicationEmailSearchEnabled,
  isCommunicationEmailSharedInboxEnabled,
  isCommunicationEmailSmartReplyEnabled,
  isCommunicationEmailTemplatesEnabled,
  isCommunicationEmailThreadsEnabled,
  isCommunicationEmailVoiceEnabled,
  isCommunicationEmailWorkspaceEnabled,
  isEmailAiCommandPaletteEnabled,
  isEmailAiContactResolutionEnabled,
  isEmailAiExecutiveAnyEnabled,
  isEmailAiExecutiveUiEnabled,
  isEmailAiGroupsEnabled,
  isEmailAiInsightsEnabled,
  isEmailAiRewriteEnabled,
  isEmailAiScheduleEnabled,
  isEmailAiSearchEnabled,
  isEmailAiSmartPreviewEnabled,
  isEmailAiSmartValidationEnabled,
  isEmailAiThreadsEnabled,
  isEmailAiVoiceEnabled,
} from "../feature-flags";
import {
  analyzeExecutiveValidation,
  applyEmailAiRewrite,
  computeEmailAiInsights,
  EMAIL_AI_REWRITE_LABELS,
  EMAIL_AI_REWRITE_STYLES,
  estimateSpamScoreHint,
  filterEmailAiCommands,
  lengthenDraftBody,
  shortenDraftBody,
  suggestScheduleIso,
  type EmailAiCommandId,
  type EmailAiRewriteStyle,
} from "../utils/email-ai-executive";
import {
  applySmartEmailAction,
  analyzeSmartSend,
  buildComposeFromAiDraft,
  buildVoiceAssistantMessage,
  composeAiEmailDraft,
  composeAiEmailIntent,
  EMAIL_DRAFT_STYLE_LABELS,
  EMAIL_DRAFT_STYLES,
  EMAIL_TEMPLATE_PRESETS,
  getSmartComposeSuggestions,
  priorityLabel,
  recipientChipLabel,
  resolveRecipientsFromQuery,
  speakAssistantMessage,
  type AiEmailIntentResult,
  type EmailDraftStyle,
  type RecipientCandidate,
  type SmartComposeSuggestion,
  type SmartEmailAction,
  type SmartSendFinding,
} from "../utils/email-ai-agent";
import {
  buildVoiceAcknowledgement,
  detectVoiceDialogueLanguage,
  speakBrowserText,
  startBrowserSpeechRecognition,
  stopBrowserSpeechSynthesis,
  voiceLangToBcp47,
} from "@/features/ai/utils/speech-providers";
import {
  applyEmailSearch,
  createEmptyComposeDraft,
  DEFAULT_EMAIL_SEARCH_FILTERS,
  defaultEmailSignature,
  draftToEmailMessage,
  EMAIL_FOLDER_IDS,
  EMAIL_FOLDER_LABELS,
  groupIntoThreads,
  loadLocalDrafts,
  loadLocalMessages,
  loadStarredIds,
  mailboxOwnerKey,
  matchesFolder,
  mergeMailboxMessages,
  notificationToEmailMessage,
  queueItemToEmailMessage,
  removeLocalDraft,
  SHARED_MAILBOX_KEYS,
  SHARED_MAILBOX_LABELS,
  toggleStarredId,
  upsertLocalDraft,
  upsertLocalMessage,
  type EmailComposeDraft,
  type EmailFolderId,
  type EmailMailboxOwner,
  type EmailMessage,
  type EmailPriority,
  type EmailSearchFilters,
} from "../utils/email-workspace";

type MobilePane = "nav" | "list" | "viewer";

const FOLDER_ICONS: Record<EmailFolderId, typeof Inbox> = {
  inbox: Inbox,
  sent: Send,
  drafts: PenSquare,
  scheduled: Loader2,
  starred: Star,
  important: Sparkles,
  archive: Archive,
  spam: MoreHorizontal,
  trash: Trash2,
};

function employeeDisplayName(employee: EmployeeProfile): string {
  const first = employee.user?.firstName ?? "";
  const last = employee.user?.lastName ?? "";
  const name = `${first} ${last}`.trim();
  return name || employee.employeeCode || "Employee";
}

/**
 * Enterprise AI Email Workspace — Communication module only.
 * Reuses notifications, emailService queue, teams/employees, AI helpers.
 */
export function EmailWorkspace() {
  const enabled =
    isCommunicationEmailWorkspaceEnabled() || isEmailAiExecutiveAnyEnabled();
  if (!enabled) {
    return (
      <div className="rounded-lg border border-border/60 px-3 py-4 text-sm text-muted-foreground">
        Email Workspace is disabled. Enable{" "}
        <code className="text-xs">COMMUNICATION_EMAIL_WORKSPACE</code> or any{" "}
        <code className="text-xs">EMAIL_AI_*</code> flag.
      </div>
    );
  }
  return <EmailWorkspaceInner />;
}

function EmailWorkspaceInner() {
  const user = useAuthStore((s) => s.user);
  const aiEnabled =
    isCommunicationEmailAiEnabled() || isEmailAiExecutiveAnyEnabled();
  const threadsEnabled =
    isCommunicationEmailThreadsEnabled() || isEmailAiThreadsEnabled();
  const voiceEnabled =
    isCommunicationEmailVoiceEnabled() || isEmailAiVoiceEnabled();
  const searchEnabled =
    isCommunicationEmailSearchEnabled() || isEmailAiSearchEnabled();
  const sharedEnabled = isCommunicationEmailSharedInboxEnabled();
  const smartReplyEnabled = isCommunicationEmailSmartReplyEnabled();
  const scheduleEnabled =
    isCommunicationEmailScheduleEnabled() || isEmailAiScheduleEnabled();
  const templatesEnabled = isCommunicationEmailTemplatesEnabled();
  const enterpriseUi =
    isCommunicationEmailEnterpriseUiEnabled() ||
    isEmailAiExecutiveUiEnabled();

  const contactResolution = isEmailAiContactResolutionEnabled();
  const smartPreview = isEmailAiSmartPreviewEnabled();
  const smartValidation = isEmailAiSmartValidationEnabled();
  const rewriteEnabled = isEmailAiRewriteEnabled();
  const insightsEnabled = isEmailAiInsightsEnabled();
  const groupsEnabled = isEmailAiGroupsEnabled();
  const commandPaletteEnabled = isEmailAiCommandPaletteEnabled();
  const executiveVoiceSpeak = isEmailAiVoiceEnabled();

  const displayName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You";
  const signature = defaultEmailSignature(displayName);

  const selfOwner = useMemo<EmailMailboxOwner>(
    () => ({
      kind: "self",
      userId: user?.id ?? "anonymous",
      label:
        `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You",
    }),
    [user?.id, user?.firstName, user?.lastName],
  );

  const [owner, setOwner] = useState<EmailMailboxOwner>(selfOwner);
  useEffect(() => {
    setOwner(selfOwner);
  }, [selfOwner]);

  const ownerKey = mailboxOwnerKey(owner);
  const [folder, setFolder] = useState<EmailFolderId>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<EmailComposeDraft | null>(
    null,
  );
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [askAiPrompt, setAskAiPrompt] = useState("");
  const [aiIntent, setAiIntent] = useState<AiEmailIntentResult | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [assistantSpeech, setAssistantSpeech] = useState<string | null>(null);
  const [smartSendFindings, setSmartSendFindings] = useState<SmartSendFinding[]>(
    [],
  );
  const [commandQuery, setCommandQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<{
    subject: string;
    recipients: string;
    queued: boolean;
    processed: boolean;
    sentAt: string;
    auditLogged: boolean;
  } | null>(null);
  const [filters, setFilters] = useState<EmailSearchFilters>(
    DEFAULT_EMAIL_SEARCH_FILTERS,
  );
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [undoSend, setUndoSend] = useState<{
    draft: EmailComposeDraft;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [starredIds, setStarredIds] = useState<Set<string>>(() => new Set());
  const [localTick, setLocalTick] = useState(0);
  const [pageSize, setPageSize] = useState(40);
  const [, startTransition] = useTransition();
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<{
    stop: () => void;
    finish: () => void;
  } | null>(null);

  const employeesQuery = useEmployees({ page: 1, limit: 100, search: "" });
  const departmentsQuery = useDepartments();
  const teamsQuery = useTeams();
  const templatesQuery = useNotificationTemplates(templatesEnabled);
  const notificationsQuery = useNotifications(
    {
      page: 1,
      pageSize: Math.min(pageSize, 100),
      userId:
        owner.kind === "employee" || owner.kind === "self"
          ? owner.userId
          : user?.id,
    },
    Boolean(user?.id),
  );
  const queueQuery = useNotificationQueue(
    { page: 1, pageSize: 40, channel: "EMAIL" },
    owner.kind === "self",
  );

  const createNotification = useCreateNotification();
  const processQueue = useProcessNotificationQueue();
  const markNotificationRead = useMarkNotificationRead();

  useEffect(() => {
    setStarredIds(loadStarredIds());
  }, []);

  const employees = useMemo(
    () => employeesQuery.data?.items ?? [],
    [employeesQuery.data?.items],
  );
  const departments = useMemo(
    () => departmentsQuery.data?.items ?? [],
    [departmentsQuery.data?.items],
  );
  const teams = useMemo(
    () => (teamsQuery.data?.items ?? []) as Team[],
    [teamsQuery.data?.items],
  );

  const recipientCatalog = useMemo<RecipientCandidate[]>(() => {
    const catalog: RecipientCandidate[] = [];
    for (const employee of employees) {
      catalog.push({
        id: `emp:${employee.id}`,
        label: employeeDisplayName(employee),
        email: employee.user?.email,
        kind: "employee",
        userIds: [employee.userId],
      });
    }
    for (const team of teams) {
      catalog.push({
        id: `team:${team.id}`,
        label: team.name,
        kind: "team",
        userIds: (team.members ?? []).map((m) => m.userId),
      });
    }
    for (const dept of departments) {
      catalog.push({
        id: `dept:${dept.id}`,
        label: dept.name,
        kind: "department",
        userIds: [],
        departmentId: dept.id,
      });
    }
    catalog.push({
      id: "role:ADMIN",
      label: "Admins",
      kind: "role",
      userIds: [],
      roleCode: "ADMIN",
    });
    catalog.push({
      id: "role:SUPER_ADMIN",
      label: "Super Admin",
      kind: "role",
      userIds: [],
      roleCode: "SUPER_ADMIN",
    });
    catalog.push({
      id: "everyone",
      label: "All Employees",
      kind: "everyone",
      userIds: employees.map((e) => e.userId),
    });
    const managerIds = [
      ...new Set(
        employees
          .map((e) => e.managerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    // Prefer manager userIds when manager relation is populated; else profile.managerId is employeeProfile id — resolve via employees list.
    const managerUserIds = [
      ...new Set(
        employees
          .filter((e) => e.manager?.id || e.managerId)
          .map((e) => {
            if (e.manager?.id) return e.manager.id;
            const mgrProfile = employees.find((m) => m.id === e.managerId);
            return mgrProfile?.userId;
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (managerUserIds.length > 0 || managerIds.length > 0) {
      catalog.push({
        id: "managers",
        label: "All Managers",
        kind: "managers",
        userIds: managerUserIds.length > 0 ? managerUserIds : managerIds,
      });
    }
    for (const key of SHARED_MAILBOX_KEYS) {
      const dept = departments.find(
        (d) =>
          d.name.toLowerCase().includes(SHARED_MAILBOX_LABELS[key].toLowerCase()) ||
          d.code.toLowerCase() === key,
      );
      catalog.push({
        id: `shared:${key}`,
        label: SHARED_MAILBOX_LABELS[key],
        kind: "shared",
        userIds: [],
        departmentId: dept?.id,
        sharedKey: key,
      });
    }
    return catalog;
  }, [employees, teams, departments]);

  const mailboxOwners = useMemo<EmailMailboxOwner[]>(() => {
    const list: EmailMailboxOwner[] = [selfOwner];
    for (const employee of employees) {
      if (employee.userId === user?.id) continue;
      list.push({
        kind: "employee",
        userId: employee.userId,
        employeeId: employee.id,
        label: employeeDisplayName(employee),
      });
    }
    if (sharedEnabled) {
      for (const key of SHARED_MAILBOX_KEYS) {
        const dept = departments.find(
          (d) =>
            d.name
              .toLowerCase()
              .includes(SHARED_MAILBOX_LABELS[key].toLowerCase()) ||
            d.code.toLowerCase() === key,
        );
        list.push({
          kind: "shared",
          key,
          label: SHARED_MAILBOX_LABELS[key],
          departmentId: dept?.id,
        });
      }
    }
    return list;
  }, [selfOwner, employees, user?.id, sharedEnabled, departments]);

  const messages = useMemo(() => {
    void localTick;
    const fromNotifications = (notificationsQuery.data?.items ?? []).map(
      (n: Notification) => notificationToEmailMessage(n, ownerKey),
    );
    const fromQueue = (queueQuery.data?.items ?? []).map((item) =>
      queueItemToEmailMessage(item, ownerKey),
    );
    const fromDrafts = loadLocalDrafts(ownerKey).map(draftToEmailMessage);
    const fromLocal = loadLocalMessages(ownerKey);
    const merged = mergeMailboxMessages([
      ...fromNotifications,
      ...fromQueue,
      ...fromDrafts,
      ...fromLocal,
    ]).map((m) => ({
      ...m,
      isStarred: m.isStarred || starredIds.has(m.id),
    }));
    return merged;
  }, [
    notificationsQuery.data?.items,
    queueQuery.data?.items,
    ownerKey,
    starredIds,
    localTick,
  ]);

  const folderMessages = useMemo(() => {
    const inFolder = messages.filter((m) => matchesFolder(m, folder));
    return searchEnabled
      ? applyEmailSearch(inFolder, filters)
      : applyEmailSearch(inFolder, {
          ...DEFAULT_EMAIL_SEARCH_FILTERS,
          query: filters.query,
        });
  }, [messages, folder, filters, searchEnabled]);

  const visibleRows = useMemo(() => {
    if (!threadsEnabled) return folderMessages;
    const threads = groupIntoThreads(folderMessages);
    return threads.map((thread) => {
      const latest = thread.messages[thread.messages.length - 1]!;
      return {
        ...latest,
        id: latest.id,
        subject: thread.subject,
        preview:
          thread.messages.length > 1
            ? `${thread.messages.length} messages · ${latest.preview}`
            : latest.preview,
        isRead: thread.unreadCount === 0,
      } satisfies EmailMessage;
    });
  }, [folderMessages, threadsEnabled]);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  const selectedThreadMessages = useMemo(() => {
    if (!selectedMessage || !threadsEnabled) {
      return selectedMessage ? [selectedMessage] : [];
    }
    return messages
      .filter((m) => m.threadId === selectedMessage.threadId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [messages, selectedMessage, threadsEnabled]);

  const folderCounts = useMemo(() => {
    const counts = {} as Record<EmailFolderId, number>;
    for (const id of EMAIL_FOLDER_IDS) {
      counts[id] = messages.filter((m) => matchesFolder(m, id)).length;
    }
    return counts;
  }, [messages]);

  const bumpLocal = useCallback(() => {
    setLocalTick((n) => n + 1);
  }, []);

  const clearFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openCompose = (seed?: Partial<EmailComposeDraft>) => {
    const base = createEmptyComposeDraft(ownerKey, signature);
    const next = { ...base, ...seed, mailboxOwnerId: ownerKey };
    setComposeDraft(next);
    setComposeOpen(true);
    setAskAiOpen(false);
    setPreviewMode(false);
    setAiIntent(null);
    setSmartSendFindings([]);
    setMobilePane("viewer");
  };

  const openAskAi = (seedPrompt = "") => {
    setAskAiPrompt(seedPrompt);
    setAskAiOpen(true);
    setComposeOpen(false);
    setPreviewMode(false);
    setAiIntent(null);
    setMobilePane("viewer");
    // Do not speak or show Listening until the microphone is pressed.
    setAssistantSpeech("");
  };

  const applyAiIntentToDraft = (
    result: AiEmailIntentResult,
    options?: { speakPreview?: boolean },
  ) => {
    setAskAiPrompt(result.originalPrompt);
    setDeliveryStatus(null);

    const speech = result.spokenPreview || result.assistantMessage;
    setAssistantSpeech(speech);
    const shouldSpeakPreview = options?.speakPreview !== false;
    if (shouldSpeakPreview && (executiveVoiceSpeak || voiceEnabled)) {
      speakAssistantMessage(speech);
    }
    setActionMessage(result.assistantMessage);

    if (result.needsDisambiguation && contactResolution) {
      setAiIntent(result);
      setComposeDraft(null);
      setComposeOpen(false);
      setPreviewMode(false);
      setAskAiOpen(false);
      setMobilePane("viewer");
      return;
    }

    if (result.recipients.length === 0) {
      setAiIntent(result);
      setComposeDraft(null);
      setComposeOpen(false);
      setPreviewMode(false);
      setAskAiOpen(false);
      setActionError(result.assistantMessage);
      setMobilePane("viewer");
      return;
    }

    const base = createEmptyComposeDraft(ownerKey, signature);
    const composed = buildComposeFromAiDraft(
      base,
      {
        subject: result.subject,
        body: result.body,
        style: result.style,
        greeting: "",
        closing: "",
        preview: result.preview,
        aiGenerated: true,
      },
      result.recipients,
    );
    composed.priority = result.priority;
    composed.to = result.recipients
      .map((r) => r.email || r.label)
      .filter(Boolean)
      .join(", ");

    if (smartValidation) {
      const findings = [
        ...analyzeSmartSend({
          to: composed.to,
          subject: composed.subject,
          body: composed.body,
          recipients: result.recipients,
        }),
        ...analyzeExecutiveValidation({
          to: composed.to,
          subject: composed.subject,
          body: composed.body,
          recipients: result.recipients,
        }),
      ];
      const seen = new Set<string>();
      setSmartSendFindings(
        findings.filter((f) => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        }),
      );
    } else {
      setSmartSendFindings([]);
    }

    setComposeDraft(composed);
    setAiIntent(result);
    setAskAiOpen(false);
    setComposeOpen(true);
    setActionError(null);
    setMobilePane("viewer");
    setPreviewMode(smartPreview);
  };

  const runAskAiPrompt = (prompt: string, selectedRecipientId?: string) => {
    if (!aiEnabled) {
      openCompose({ body: prompt });
      return;
    }
    const cleaned = prompt.trim();
    if (!cleaned) {
      setActionError("Tell AI what email to send.");
      return;
    }
    clearFeedback();
    const result = composeAiEmailIntent({
      prompt: cleaned,
      catalog: recipientCatalog,
      authorName: displayName,
      selectedRecipientId,
      contactResolution,
      groupsEnabled,
    });
    applyAiIntentToDraft(result);
  };

  const resolveAmbiguousRecipient = (candidateId: string) => {
    const prompt = aiIntent?.originalPrompt || askAiPrompt;
    if (!prompt.trim()) return;
    runAskAiPrompt(prompt, candidateId);
  };

  const persistDraft = useCallback(
    (draft: EmailComposeDraft) => {
      upsertLocalDraft({ ...draft, updatedAt: new Date().toISOString() });
      bumpLocal();
    },
    [bumpLocal],
  );

  useEffect(() => {
    if (!composeOpen || !composeDraft || previewMode) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      persistDraft(composeDraft);
    }, 1200);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [composeDraft, composeOpen, persistDraft, previewMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (
        commandPaletteEnabled &&
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }

      if (event.key === "Escape") {
        setComposeOpen(false);
        setAskAiOpen(false);
        setPreviewMode(false);
        setAiIntent(null);
        setCommandOpen(false);
        return;
      }

      if (!enterpriseUi || typing) return;

      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        openAskAi();
      }
      if (event.key === "/" && searchEnabled) {
        event.preventDefault();
        document.getElementById("email-workspace-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterpriseUi, searchEnabled, commandPaletteEnabled]);

  const applyAiToCompose = (style: EmailDraftStyle, prompt: string) => {
    if (!aiEnabled || !composeDraft) return;
    const draft = composeAiEmailDraft({
      prompt,
      style,
      authorName: displayName,
    });
    setComposeDraft((prev) =>
      prev
        ? {
            ...prev,
            subject: draft.subject,
            body: `${draft.body}${prev.signature ? `\n${prev.signature}` : ""}`,
            aiGenerated: true,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
    setActionMessage(`AI draft ready (${EMAIL_DRAFT_STYLE_LABELS[style]})`);
  };

  const runSmartAction = (action: SmartEmailAction) => {
    if (!smartReplyEnabled && action === "smart_reply") return;
    if (!aiEnabled) return;
    const source = selectedMessage ?? {
      subject: composeDraft?.subject ?? "",
      body: composeDraft?.body ?? "",
    };
    const result = applySmartEmailAction(
      action,
      {
        subject: source.subject,
        body: "body" in source ? source.body : "",
        threadBodies: selectedThreadMessages.map((m) => m.body),
      },
      { tone: "professional" },
    );
    if (composeOpen && composeDraft) {
      setComposeDraft({
        ...composeDraft,
        subject: result.subject,
        body: result.body,
        aiGenerated: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      openCompose({
        subject: result.subject,
        body: result.body,
        aiGenerated: true,
        to:
          action === "smart_reply" && selectedMessage
            ? selectedMessage.fromEmail
            : "",
      });
    }
    setActionMessage(result.note);
  };

  const performSend = async (
    draft: EmailComposeDraft,
  ): Promise<{ ok: boolean; processed: boolean }> => {
    clearFeedback();
    if (!user?.id) {
      setActionError("Sign in required to send email.");
      return { ok: false, processed: false };
    }

    const isThreadedReply =
      Boolean(selectedMessage?.notificationId) && /^re:/i.test(draft.subject.trim());

    if (isThreadedReply && selectedMessage?.notificationId) {
      try {
        await notificationsService.createReply(selectedMessage.notificationId, {
          message: draft.body.slice(0, 2000) || " ",
          syncToEntity: true,
        });
        let processed = false;
        try {
          await processQueue.mutateAsync();
          processed = true;
        } catch {
          // server may already flush queue after reply notify
        }
        const threadId = selectedMessage.threadId;
        const sentLocal: EmailMessage = {
          ...draftToEmailMessage(draft),
          id: `local-sent-${crypto.randomUUID()}`,
          threadId,
          folder: "sent",
          source: "local",
          createdAt: new Date().toISOString(),
          isRead: true,
        };
        upsertLocalMessage(sentLocal);
        removeLocalDraft(draft.id);
        bumpLocal();
        setComposeOpen(false);
        setComposeDraft(null);
        setAiIntent(null);
        setPreviewMode(false);
        setActionMessage("Reply sent — thread updated for the original sender");
        void notificationsQuery.refetch();
        void queueQuery.refetch();
        return { ok: true, processed };
      } catch (error) {
        setActionError(
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Reply failed",
        );
        return { ok: false, processed: false };
      }
    }

    // Prefer AI-resolved recipients when available
    const matchedFromIntent =
      aiIntent && aiIntent.recipients.length > 0 ? aiIntent.recipients : null;
    const resolved = matchedFromIntent
      ? { matched: matchedFromIntent, unresolved: [] as string[], query: draft.to }
      : resolveRecipientsFromQuery(draft.to, recipientCatalog);

    if (resolved.matched.length === 0 && !draft.to.trim()) {
      setActionError("Add at least one recipient.");
      return { ok: false, processed: false };
    }

    const matched = resolved.matched;
    const collectedUserIds = [
      ...new Set(matched.flatMap((m) => m.userIds).filter(Boolean)),
    ];
    const singleDept =
      matched.length === 1 &&
      (matched[0]?.kind === "department" || matched[0]?.kind === "shared") &&
      matched[0]?.departmentId
        ? matched[0]
        : null;
    const singleRole =
      matched.length === 1 && matched[0]?.kind === "role" && matched[0]?.roleCode
        ? matched[0]
        : null;

    let audienceType: "INDIVIDUAL" | "ROLE" | "DEPARTMENT" | "USER_LIST" =
      "USER_LIST";
    let targetUserId: string | undefined;
    let userIds: string[] | undefined = collectedUserIds;
    let roleCode: string | undefined;
    let departmentId: string | undefined;

    if (singleDept) {
      audienceType = "DEPARTMENT";
      departmentId = singleDept.departmentId;
      userIds = undefined;
    } else if (singleRole) {
      audienceType = "ROLE";
      roleCode = singleRole.roleCode;
      userIds = undefined;
    } else if (collectedUserIds.length === 1) {
      audienceType = "INDIVIDUAL";
      targetUserId = collectedUserIds[0];
      userIds = undefined;
    } else if (collectedUserIds.length > 1) {
      audienceType = "USER_LIST";
      userIds = collectedUserIds;
      targetUserId = collectedUserIds[0];
    } else {
      const fallback =
        employees.find(
          (e) =>
            e.user?.email?.toLowerCase() === draft.to.trim().toLowerCase() ||
            employeeDisplayName(e).toLowerCase() === draft.to.trim().toLowerCase(),
        )?.userId ??
        (owner.kind !== "shared" ? owner.userId : user.id);
      audienceType = "INDIVIDUAL";
      targetUserId = fallback;
      userIds = undefined;
    }

    const threadId =
      selectedMessage?.threadId ??
      `thread:mail:${user.id}:${crypto.randomUUID()}`;

    try {
      await createNotification.mutateAsync({
        userId: targetUserId,
        userIds,
        title: draft.subject || "EliteFlow email",
        body: draft.body.slice(0, 2000) || " ",
        category: "SYSTEM",
        priority: draft.priority,
        sendEmail: true,
        audienceType,
        roleCode,
        departmentId,
        scheduledFor:
          scheduleEnabled && draft.scheduledFor
            ? draft.scheduledFor
            : undefined,
        metadata: {
          source: "communication_email_workspace",
          aiGenerated: Boolean(draft.aiGenerated),
          fromName: displayName,
          fromEmail: user.email,
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          mailboxOwnerId: draft.mailboxOwnerId,
          threadId,
          recipientLabels: matched.map((m) => m.label),
        },
      });
      let processed = false;
      try {
        await processQueue.mutateAsync();
        processed = true;
      } catch {
        // queue may already have been processed server-side after create
      }

      const sentLocal: EmailMessage = {
        ...draftToEmailMessage(draft),
        id: `local-sent-${crypto.randomUUID()}`,
        threadId,
        folder: draft.scheduledFor && scheduleEnabled ? "scheduled" : "sent",
        source: "local",
        createdAt: new Date().toISOString(),
        isRead: true,
      };
      upsertLocalMessage(sentLocal);
      removeLocalDraft(draft.id);
      bumpLocal();
      setComposeOpen(false);
      setComposeDraft(null);
      setAiIntent(null);
      setPreviewMode(false);
      setDeliveryStatus({
        subject: draft.subject,
        recipients: matched.map(recipientChipLabel).join(", ") || draft.to,
        queued: true,
        processed,
        sentAt: new Date().toISOString(),
        auditLogged: true,
      });
      setActionMessage(
        draft.scheduledFor && scheduleEnabled
          ? "Email scheduled via notification queue"
          : processed
            ? "Email sent successfully — delivered via emailService queue"
            : "Email queued for delivery — processing in progress",
      );
      void notificationsQuery.refetch();
      void queueQuery.refetch();
      return { ok: true, processed };
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Send failed",
      );
      return { ok: false, processed: false };
    }
  };

  const handleSendWithUndo = (draft: EmailComposeDraft) => {
    const findings = analyzeSmartSend({
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      recentSubjects: messages
        .filter((m) => m.folder === "sent")
        .map((m) => m.subject)
        .slice(0, 20),
    });
    setSmartSendFindings(findings);
    if (findings.some((f) => f.severity === "error")) {
      setActionError("Fix send recommendations before sending.");
      setPreviewMode(false);
      return;
    }
    if (undoSend) {
      clearTimeout(undoSend.timeoutId);
      setUndoSend(null);
    }
    setActionMessage("Sending… Undo available for 5s");
    const timeoutId = setTimeout(() => {
      setUndoSend(null);
      void performSend(draft).then(() => {
        const sentMsg = buildVoiceAssistantMessage({ phase: "sent" });
        setAssistantSpeech(sentMsg);
        speakAssistantMessage(sentMsg);
      });
    }, 5000);
    setUndoSend({ draft, timeoutId });
    setComposeOpen(false);
    setPreviewMode(false);
  };

  const handleUndoSend = () => {
    if (!undoSend) return;
    clearTimeout(undoSend.timeoutId);
    setComposeDraft(undoSend.draft);
    setComposeOpen(true);
    setUndoSend(null);
    setActionMessage("Send cancelled — draft restored");
  };

  const handleVoiceCommand = async (transcript: string) => {
    if (!voiceEnabled && !aiEnabled) return;
    const spoken = transcript.trim();
    if (!spoken) return;

    const lang = detectVoiceDialogueLanguage(spoken);
    setVoiceTranscript(spoken);
    setAssistantSpeech("Thinking...");
    setActionMessage("Thinking...");

    // One short acknowledgement only — never speak the generated email body.
    if (executiveVoiceSpeak || voiceEnabled) {
      const acknowledgement = buildVoiceAcknowledgement(lang);
      setAssistantSpeech(acknowledgement);
      await speakBrowserText(acknowledgement, {
        lang: voiceLangToBcp47(lang),
      });
    }

    const result = composeAiEmailIntent({
      prompt: spoken,
      catalog: recipientCatalog,
      authorName: displayName,
      contactResolution,
      groupsEnabled,
    });
    // Email draft stays professional English; do not TTS preview/body.
    applyAiIntentToDraft(result, { speakPreview: false });
    setAssistantSpeech("Your email is ready.");
    setActionMessage(result.assistantMessage);
  };

  const toggleVoiceListen = () => {
    if (!voiceEnabled) return;

    if (voiceListening && recognitionRef.current) {
      recognitionRef.current.finish();
      recognitionRef.current = null;
      setVoiceListening(false);
      return;
    }

    // Silent listen — no greeting / no TTS on mic press.
    stopBrowserSpeechSynthesis();
    setVoiceTranscript("");
    setAssistantSpeech("Listening...");
    setVoiceListening(true);
    clearFeedback();

    const session = startBrowserSpeechRecognition(
      {
        onTranscript: (text) => {
          setVoiceTranscript(text);
        },
        onUtteranceComplete: (text) => {
          recognitionRef.current = null;
          setVoiceListening(false);
          void handleVoiceCommand(text);
        },
        onNoSpeech: () => {
          recognitionRef.current = null;
          setVoiceListening(false);
          setAssistantSpeech("");
          setActionError(
            "No speech detected. Press Voice when you are ready to speak.",
          );
        },
        onError: () => {
          recognitionRef.current = null;
          setVoiceListening(false);
          setActionError("Voice recognition failed");
        },
      },
      { silenceMs: 1800, maxWaitForSpeechMs: 60_000 },
    );

    if (!session) {
      setVoiceListening(false);
      setActionError("Speech recognition is not available in this browser.");
      return;
    }

    recognitionRef.current = session;
  };

  const confirmAiSend = () => {
    if (!composeDraft) return;
    if (!aiIntent || aiIntent.recipients.length === 0) {
      setActionError("Select a recipient before sending.");
      return;
    }
    if (smartValidation) {
      const findings = [
        ...analyzeSmartSend({
          to: composeDraft.to,
          subject: composeDraft.subject,
          body: composeDraft.body,
          recipients: aiIntent.recipients,
          recentSubjects: messages
            .filter((m) => m.folder === "sent")
            .map((m) => m.subject)
            .slice(0, 20),
        }),
        ...analyzeExecutiveValidation({
          to: composeDraft.to,
          subject: composeDraft.subject,
          body: composeDraft.body,
          recipients: aiIntent.recipients,
          scheduledFor: composeDraft.scheduledFor,
          recentSubjects: messages
            .filter((m) => m.folder === "sent")
            .map((m) => m.subject)
            .slice(0, 20),
        }),
      ];
      const seen = new Set<string>();
      const deduped = findings.filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
      setSmartSendFindings(deduped);
      if (deduped.some((f) => f.severity === "error")) {
        setActionError(
          deduped.find((f) => f.severity === "error")?.message ??
            "Cannot send yet.",
        );
        return;
      }
    }
    const delivering = buildVoiceAssistantMessage({ phase: "delivering" });
    setAssistantSpeech(delivering);
    setActionMessage(delivering);
    void performSend(composeDraft).then((result) => {
      if (!result.ok) return;
      const sentMsg = buildVoiceAssistantMessage({ phase: "sent" });
      setAssistantSpeech(sentMsg);
      if (executiveVoiceSpeak || voiceEnabled) {
        speakAssistantMessage(sentMsg);
      }
    });
  };

  const regenerateAiDraft = () => {
    const prompt =
      askAiPrompt || voiceTranscript || aiIntent?.originalPrompt || "";
    if (!prompt.trim()) return;
    const selectedId =
      aiIntent?.recipients.length === 1 ? aiIntent.recipients[0]?.id : undefined;
    runAskAiPrompt(prompt, selectedId);
  };

  const applyRewriteStyle = (style: EmailAiRewriteStyle) => {
    if (!rewriteEnabled || !composeDraft) return;
    const result = applyEmailAiRewrite(style, composeDraft, displayName);
    setComposeDraft({
      ...composeDraft,
      subject: result.subject,
      body: result.body,
      aiGenerated: true,
      updatedAt: new Date().toISOString(),
    });
    setActionMessage(result.note);
  };

  const emailInsights = useMemo(
    () =>
      insightsEnabled
        ? computeEmailAiInsights(queueQuery.data?.items ?? [])
        : null,
    [insightsEnabled, queueQuery.data?.items],
  );

  const runCommand = (id: EmailAiCommandId) => {
    setCommandOpen(false);
    setCommandQuery("");
    switch (id) {
      case "send_email":
        openAskAi();
        break;
      case "reply":
        if (selectedMessage) {
          openCompose({
            to: selectedMessage.fromEmail,
            subject: selectedMessage.subject.startsWith("Re:")
              ? selectedMessage.subject
              : `Re: ${selectedMessage.subject}`,
          });
        }
        break;
      case "forward":
        if (selectedMessage) {
          openCompose({
            subject: selectedMessage.subject.startsWith("Fwd:")
              ? selectedMessage.subject
              : `Fwd: ${selectedMessage.subject}`,
            body: `\n\n---------- Forwarded message ----------\n${selectedMessage.body}`,
          });
        }
        break;
      case "summarize_thread":
        runSmartAction("summarize_thread");
        break;
      case "translate":
        runSmartAction("translate");
        break;
      case "rewrite":
        if (rewriteEnabled) applyRewriteStyle("professional");
        break;
      case "schedule":
        if (scheduleEnabled && composeDraft) {
          setComposeDraft({
            ...composeDraft,
            scheduledFor: suggestScheduleIso("tomorrow"),
          });
          setActionMessage("Scheduled for tomorrow 09:00 (local)");
        }
        break;
      case "cancel_schedule":
        if (composeDraft) {
          setComposeDraft({ ...composeDraft, scheduledFor: null });
          setActionMessage("Schedule cleared");
        }
        break;
      case "mark_important":
        if (selectedMessage) {
          setStarredIds(toggleStarredId(selectedMessage.id));
          bumpLocal();
        }
        break;
      case "archive":
        if (selectedMessage) {
          upsertLocalMessage({
            ...selectedMessage,
            folder: "archive",
            source: "local",
          });
          bumpLocal();
          setSelectedId(null);
        }
        break;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden border border-zinc-800/80 bg-zinc-950 text-zinc-100 shadow-2xl",
        enterpriseUi &&
          "transition-[box-shadow,border-color] duration-300 ease-out",
        "-mx-3 -mb-2 -mt-4 h-[calc(100dvh-4.25rem)] rounded-none",
        "sm:-mx-4 sm:-mt-6 sm:h-[calc(100dvh-4.5rem)] sm:rounded-xl",
        "lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)]",
      )}
      role="application"
      aria-label="EliteFlow Email Workspace"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/90 bg-zinc-950/95 px-3 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-700/80">
            <Mail className="h-4 w-4 text-zinc-200" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-50">
              Email · {owner.label}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              AI-first enterprise workspace
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {commandPaletteEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-100"
              onClick={() => setCommandOpen(true)}
            >
              Commands
            </Button>
          ) : null}
          {voiceEnabled ? (
            <Button
              type="button"
              size="sm"
              variant={voiceListening ? "default" : "outline"}
              className={cn(
                "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
                voiceListening && "bg-emerald-600 text-white hover:bg-emerald-500",
              )}
              onClick={toggleVoiceListen}
              aria-pressed={voiceListening}
            >
              <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {voiceListening ? "Listening…" : "Voice"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            onClick={() => openCompose()}
          >
            <PenSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Manual
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-zinc-100 text-zinc-950 hover:bg-white"
            onClick={() => openAskAi()}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Ask AI to send an email
          </Button>
        </div>
      </div>

      {(actionMessage ||
        actionError ||
        undoSend ||
        voiceTranscript ||
        assistantSpeech) && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-xs",
            actionError
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-400",
          )}
          role="status"
        >
          <span>
            {actionError ??
              (undoSend
                ? "Message queued for send…"
                : assistantSpeech ??
                  actionMessage ??
                  (voiceTranscript ? `Heard: ${voiceTranscript}` : null))}
          </span>
          <div className="flex gap-2">
            {undoSend ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-transparent"
                onClick={handleUndoSend}
              >
                Undo Send
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => {
                clearFeedback();
                setVoiceTranscript("");
                setAssistantSpeech(null);
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-full shrink-0 border-r border-zinc-800 bg-zinc-950 md:flex md:w-52 md:flex-col xl:w-56",
            mobilePane === "nav" ? "flex" : "hidden md:flex",
          )}
          aria-label="Email folders and mailboxes"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
            <Button
              type="button"
              className="mb-3 w-full justify-start bg-zinc-100 text-zinc-950 hover:bg-white"
              size="sm"
              onClick={() => openAskAi()}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Ask AI
            </Button>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Folders
            </p>
            <nav className="space-y-0.5">
              {EMAIL_FOLDER_IDS.map((id) => {
                const Icon = FOLDER_ICONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      folder === id
                        ? "bg-zinc-800 font-medium text-zinc-50"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                    )}
                    onClick={() => {
                      startTransition(() => {
                        setFolder(id);
                        setSelectedId(null);
                        setMobilePane("list");
                      });
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">
                      {EMAIL_FOLDER_LABELS[id]}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-600">
                      {folderCounts[id] || ""}
                    </span>
                  </button>
                );
              })}
            </nav>

            <p className="mt-4 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Mailboxes
            </p>
            <ul className="space-y-0.5">
              {mailboxOwners.map((item) => {
                const key = mailboxOwnerKey(item);
                const active = key === ownerKey;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-zinc-800 font-medium text-zinc-50"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                      )}
                      onClick={() => {
                        setOwner(item);
                        setSelectedId(null);
                        setFolder("inbox");
                        setMobilePane("list");
                      }}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          item.kind === "shared"
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {insightsEnabled && emailInsights ? (
              <div className="mt-4 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Insights
                </p>
                <p className="px-1 text-[11px] text-zinc-400">
                  Delivery {emailInsights.deliveryRate}% · Queued{" "}
                  {emailInsights.queued} · Failed {emailInsights.failed}
                </p>
                <p className="px-1 text-[11px] text-zinc-500">
                  Open hint {emailInsights.openRateHint}% · Reply hint{" "}
                  {emailInsights.replyRateHint}%
                </p>
                <p className="px-1 text-[11px] text-zinc-500">
                  {emailInsights.recommendations[0]}
                </p>
              </div>
            ) : null}
          </div>
        </aside>

        {/* Conversation list */}
        <section
          className={cn(
            "w-full shrink-0 border-r border-zinc-800 bg-zinc-950/80 md:flex md:w-80 md:flex-col xl:w-[22rem]",
            mobilePane === "list" ? "flex flex-col" : "hidden md:flex",
          )}
          aria-label="Email list"
        >
          <div className="space-y-2 border-b border-zinc-800 p-2.5">
            <div className="flex items-center gap-2 md:hidden">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-zinc-400"
                onClick={() => setMobilePane("nav")}
              >
                Folders
              </Button>
              <span className="text-xs font-medium text-zinc-200">
                {EMAIL_FOLDER_LABELS[folder]}
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-zinc-500"
                aria-hidden
              />
              <Input
                id="email-workspace-search"
                value={filters.query}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, query: e.target.value }))
                }
                placeholder="Search mail"
                className="h-9 border-zinc-800 bg-zinc-900/80 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterChip
                active={Boolean(filters.unreadOnly)}
                onClick={() =>
                  setFilters((f) => ({ ...f, unreadOnly: !f.unreadOnly }))
                }
                label="Unread"
              />
              <FilterChip
                active={Boolean(filters.aiGeneratedOnly)}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    aiGeneratedOnly: !f.aiGeneratedOnly,
                  }))
                }
                label="AI"
              />
              <FilterChip
                active={filters.priority === "HIGH" || filters.priority === "URGENT"}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    priority:
                      f.priority === "HIGH" || f.priority === "URGENT"
                        ? "ALL"
                        : "HIGH",
                  }))
                }
                label="Priority"
              />
            </div>
            {searchEnabled ? (
              <div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                  onClick={() => setShowAdvancedSearch((v) => !v)}
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      showAdvancedSearch && "rotate-180",
                    )}
                  />
                  More filters
                </button>
                {showAdvancedSearch ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Input
                      placeholder="Subject"
                      className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-100"
                      value={filters.subject ?? ""}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, subject: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Sender"
                      className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-100"
                      value={filters.sender ?? ""}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, sender: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Recipient"
                      className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-100"
                      value={filters.recipient ?? ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          recipient: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Department"
                      className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-100"
                      value={filters.department ?? ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          department: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notificationsQuery.isLoading && visibleRows.length === 0 ? (
              <EmailListSkeleton />
            ) : visibleRows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">
                No messages in {EMAIL_FOLDER_LABELS[folder].toLowerCase()}.
              </p>
            ) : (
              <ul>
                {visibleRows.map((message) => (
                  <li key={message.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b border-zinc-900 px-3 py-2.5 text-left transition-colors",
                        selectedId === message.id
                          ? "bg-zinc-900"
                          : "hover:bg-zinc-900/60",
                        !message.isRead && "bg-zinc-950",
                      )}
                      onClick={() => {
                        setSelectedId(message.id);
                        setComposeOpen(false);
                        setAskAiOpen(false);
                        setMobilePane("viewer");
                        if (
                          !message.isRead &&
                          message.notificationId &&
                          message.source === "notification"
                        ) {
                          markNotificationRead.mutate(message.notificationId);
                        }
                      }}
                      onContextMenu={(e) => {
                        if (!enterpriseUi) return;
                        e.preventDefault();
                        setStarredIds(toggleStarredId(message.id));
                        bumpLocal();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            !message.isRead
                              ? "font-semibold text-zinc-50"
                              : "text-zinc-300",
                          )}
                        >
                          {message.fromName}
                        </span>
                        <span className="shrink-0 text-[10px] text-zinc-600">
                          {formatRelativeTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "truncate text-xs",
                            !message.isRead
                              ? "font-medium text-zinc-200"
                              : "text-zinc-500",
                          )}
                        >
                          {message.subject}
                        </span>
                        {message.aiGenerated ? (
                          <Badge
                            variant="outline"
                            className="h-4 border-zinc-700 px-1 text-[9px] text-zinc-400"
                          >
                            AI
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                        <span className="truncate">{message.preview}</span>
                        {message.hasAttachments ? (
                          <Paperclip className="h-3 w-3 shrink-0" aria-hidden />
                        ) : null}
                        {message.isStarred ? (
                          <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                        ) : null}
                        {message.priority === "HIGH" ||
                        message.priority === "URGENT" ? (
                          <Badge
                            variant="warning"
                            className="h-4 px-1 text-[9px]"
                          >
                            {message.priority}
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {visibleRows.length >= pageSize ? (
              <div className="p-2 text-center">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-zinc-500"
                  onClick={() => setPageSize((n) => n + 40)}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Viewer / Ask AI / Compose */}
        <section
          className={cn(
            "min-w-0 flex-1 flex-col bg-zinc-950",
            mobilePane === "viewer" || composeOpen || askAiOpen
              ? "flex"
              : "hidden md:flex",
          )}
          aria-label="Email viewer"
        >
          {askAiOpen ? (
            <AskAiPanel
              prompt={askAiPrompt}
              setPrompt={setAskAiPrompt}
              listening={voiceListening}
              onClose={() => setAskAiOpen(false)}
              onSubmit={() => runAskAiPrompt(askAiPrompt)}
              onVoice={toggleVoiceListen}
              voiceEnabled={voiceEnabled}
            />
          ) : deliveryStatus ? (
            <DeliverySuccessPanel
              status={deliveryStatus}
              onDismiss={() => setDeliveryStatus(null)}
              onAskAgain={() => {
                setDeliveryStatus(null);
                openAskAi();
              }}
            />
          ) : aiIntent?.needsDisambiguation ? (
            <DisambiguationPanel
              intent={aiIntent}
              onSelect={resolveAmbiguousRecipient}
              onCancel={() => {
                setAiIntent(null);
                setAskAiOpen(true);
                setAssistantSpeech(
                  buildVoiceAssistantMessage({ phase: "cancelled" }),
                );
              }}
            />
          ) : aiIntent &&
            !aiIntent.needsDisambiguation &&
            aiIntent.recipients.length === 0 ? (
            <UnresolvedRecipientPanel
              intent={aiIntent}
              onRetry={() => {
                setAiIntent(null);
                setAskAiOpen(true);
                setAskAiPrompt(aiIntent.originalPrompt);
                setActionError(null);
              }}
            />
          ) : composeOpen && composeDraft && previewMode && aiIntent ? (
            <AiPreviewCard
              intent={aiIntent}
              draft={composeDraft}
              findings={smartSendFindings}
              sending={
                createNotification.isPending || processQueue.isPending
              }
              rewriteEnabled={rewriteEnabled}
              scheduleEnabled={scheduleEnabled}
              smartValidation={smartValidation}
              onConfirm={confirmAiSend}
              onEdit={() => {
                setPreviewMode(false);
                setActionMessage(
                  "Edit mode — update the draft, then preview again.",
                );
              }}
              onRegenerate={regenerateAiDraft}
              onRewrite={applyRewriteStyle}
              onShorten={() => {
                setComposeDraft({
                  ...composeDraft,
                  body: shortenDraftBody(composeDraft.body),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onLengthen={() => {
                setComposeDraft({
                  ...composeDraft,
                  body: lengthenDraftBody(composeDraft.body),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSchedule={(hint) => {
                setComposeDraft({
                  ...composeDraft,
                  scheduledFor: suggestScheduleIso(hint),
                });
              }}
              onCancel={() => {
                setComposeOpen(false);
                setPreviewMode(false);
                setAiIntent(null);
                setComposeDraft(null);
                const cancelled = buildVoiceAssistantMessage({
                  phase: "cancelled",
                });
                setAssistantSpeech(cancelled);
                if (executiveVoiceSpeak || voiceEnabled) {
                  speakAssistantMessage(cancelled);
                }
                setActionMessage(cancelled);
              }}
            />
          ) : composeOpen && composeDraft ? (
            <ComposePanel
              draft={composeDraft}
              setDraft={setComposeDraft}
              aiEnabled={aiEnabled}
              templatesEnabled={templatesEnabled}
              scheduleEnabled={scheduleEnabled}
              templates={templatesQuery.data?.items ?? []}
              recipientCatalog={recipientCatalog}
              smartSendFindings={smartSendFindings}
              onClose={() => {
                if (composeDraft) persistDraft(composeDraft);
                setComposeOpen(false);
                setPreviewMode(false);
              }}
              onSend={() => handleSendWithUndo(composeDraft)}
              onPreview={() => {
                if (!composeDraft) return;
                const findings = analyzeSmartSend({
                  to: composeDraft.to,
                  subject: composeDraft.subject,
                  body: composeDraft.body,
                });
                setSmartSendFindings(findings);
                const resolved = resolveRecipientsFromQuery(
                  composeDraft.to,
                  recipientCatalog,
                );
                setAiIntent({
                  subject: composeDraft.subject,
                  body: composeDraft.body,
                  preview: composeDraft.body.slice(0, 180),
                  style: "professional",
                  priority: composeDraft.priority,
                  emailType: "general",
                  language: "English",
                  recipients: resolved.matched,
                  unresolved: resolved.unresolved,
                  ambiguousCandidates: [],
                  needsDisambiguation: false,
                  originalPrompt: askAiPrompt || composeDraft.subject,
                  urgencyLabel: priorityLabel(composeDraft.priority),
                  assistantMessage:
                    "I've prepared the email. Would you like me to send it now?",
                  spokenPreview:
                    "I've prepared the email. Would you like me to send it now?",
                  estimatedDelivery: "Immediate via emailService queue",
                  category: "General",
                });
                setPreviewMode(true);
              }}
              onAiStyle={(style) =>
                applyAiToCompose(
                  style,
                  composeDraft.body ||
                    composeDraft.subject ||
                    "Write a professional email",
                )
              }
              onApplyTemplate={(preset) => {
                setComposeDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        subject: preset.subject,
                        body: `${preset.body}${prev.signature ? `\n${prev.signature}` : ""}`,
                        templateCode: preset.code,
                        updatedAt: new Date().toISOString(),
                      }
                    : prev,
                );
              }}
              onSmartAction={runSmartAction}
              sending={createNotification.isPending}
            />
          ) : selectedMessage ? (
            <ViewerPanel
              message={selectedMessage}
              threadMessages={selectedThreadMessages}
              threadsEnabled={threadsEnabled}
              aiEnabled={aiEnabled}
              smartReplyEnabled={smartReplyEnabled}
              scheduleEnabled={scheduleEnabled}
              onBack={() => setMobilePane("list")}
              onReply={() =>
                openCompose({
                  to: selectedMessage.fromEmail,
                  subject: selectedMessage.subject.startsWith("Re:")
                    ? selectedMessage.subject
                    : `Re: ${selectedMessage.subject}`,
                })
              }
              onReplyAll={() =>
                openCompose({
                  to: [selectedMessage.fromEmail, ...selectedMessage.to]
                    .filter(Boolean)
                    .join(", "),
                  cc: selectedMessage.cc.join(", "),
                  subject: selectedMessage.subject.startsWith("Re:")
                    ? selectedMessage.subject
                    : `Re: ${selectedMessage.subject}`,
                })
              }
              onForward={() =>
                openCompose({
                  subject: selectedMessage.subject.startsWith("Fwd:")
                    ? selectedMessage.subject
                    : `Fwd: ${selectedMessage.subject}`,
                  body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedMessage.fromName}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body}`,
                })
              }
              onAskAi={() =>
                openAskAi(
                  `Reply to ${selectedMessage.fromName} about: ${selectedMessage.subject}`,
                )
              }
              onArchive={() => {
                upsertLocalMessage({
                  ...selectedMessage,
                  folder: "archive",
                  source: "local",
                });
                bumpLocal();
                setSelectedId(null);
                setActionMessage("Archived");
              }}
              onDelete={() => {
                upsertLocalMessage({
                  ...selectedMessage,
                  folder: "trash",
                  source: "local",
                });
                bumpLocal();
                setSelectedId(null);
                setActionMessage("Moved to Trash");
              }}
              onToggleStar={() => {
                setStarredIds(toggleStarredId(selectedMessage.id));
                bumpLocal();
              }}
              onSchedule={() => {
                if (!scheduleEnabled) return;
                const when = new Date();
                when.setDate(when.getDate() + 1);
                when.setHours(9, 0, 0, 0);
                openCompose({
                  to: selectedMessage.to.join(", "),
                  subject: selectedMessage.subject,
                  body: selectedMessage.body,
                  scheduledFor: when.toISOString(),
                });
              }}
              onSmartAction={runSmartAction}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                <Sparkles className="h-6 w-6 text-zinc-300" aria-hidden />
              </div>
              <div className="max-w-sm space-y-2">
                <p className="text-base font-semibold tracking-tight text-zinc-50">
                  Ask AI to send an email
                </p>
                <p className="text-sm text-zinc-500">
                  Type or speak in Urdu or English. AI detects recipients,
                  writes a professional email, and shows a preview before send.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-zinc-100 text-zinc-950 hover:bg-white"
                  onClick={() => openAskAi()}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Ask AI
                </Button>
                {voiceEnabled ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 bg-transparent text-zinc-200"
                    onClick={toggleVoiceListen}
                  >
                    <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Speak
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-600">
                Press <kbd className="rounded border border-zinc-700 px-1">C</kbd>{" "}
                to ask AI · Manual compose available from the toolbar
              </p>
            </div>
          )}
        </section>
      </div>

      {commandPaletteEnabled && commandOpen ? (
        <div
          className="absolute inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
          role="dialog"
          aria-label="AI command palette"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              autoFocus
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              placeholder="Send email, reply, summarize, schedule…"
              className="h-11 rounded-none border-0 border-b border-zinc-800 bg-transparent text-zinc-100"
            />
            <ul className="max-h-72 overflow-y-auto p-1">
              {filterEmailAiCommands(commandQuery).map((cmd) => (
                <li key={cmd.id}>
                  <button
                    type="button"
                    className="flex w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-900"
                    onClick={() => runCommand(cmd.id)}
                  >
                    {cmd.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] transition-colors",
        props.active
          ? "bg-zinc-100 text-zinc-950"
          : "bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800 hover:text-zinc-300",
      )}
    >
      {props.label}
    </button>
  );
}

function EmailListSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-1.5 rounded-md border border-zinc-900 p-2"
        >
          <div className="h-3 w-1/3 rounded bg-zinc-800" />
          <div className="h-3 w-2/3 rounded bg-zinc-800" />
          <div className="h-2 w-full rounded bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}

function AskAiPanel(props: {
  prompt: string;
  setPrompt: (value: string) => void;
  listening: boolean;
  voiceEnabled: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onVoice: () => void;
}) {
  const examples = [
    "Ali Ahmad ko thank you email bhej do.",
    "Kal 2 baje tamam employees ko meeting ki email bhej do.",
    "Finance team ko payroll reminder bhej do.",
    "HR ko leave policy update send kar do.",
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-200" aria-hidden />
          <p className="text-sm font-semibold text-zinc-50">
            Ask AI to send an email
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-500"
          onClick={props.onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-zinc-400">
          Describe what you need in Urdu or English. AI will detect recipients,
          write a professional English email, and show a preview before send.
        </p>
        <Textarea
          value={props.prompt}
          onChange={(e) => props.setPrompt(e.target.value)}
          rows={5}
          className="min-h-[140px] resize-y border-zinc-800 bg-zinc-900/80 font-sans text-sm text-zinc-100 placeholder:text-zinc-600"
          placeholder="e.g. Kal 2 baje Zoom meeting hai, tamam employees ko inform kar do."
          aria-label="Ask AI prompt"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              props.onSubmit();
            }
          }}
        />
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            Try saying
          </p>
          <div className="flex flex-col gap-1.5">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                onClick={() => props.setPrompt(example)}
              >
                “{example}”
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
        {props.voiceEnabled ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "border-zinc-700 bg-transparent text-zinc-200",
              props.listening && "border-emerald-600 text-emerald-400",
            )}
            onClick={props.onVoice}
          >
            <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {props.listening ? "Listening…" : "Speak"}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          size="sm"
          className="bg-zinc-100 text-zinc-950 hover:bg-white"
          onClick={props.onSubmit}
          disabled={!props.prompt.trim()}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Generate preview
        </Button>
      </div>
    </div>
  );
}

function AiPreviewCard(props: {
  intent: AiEmailIntentResult;
  draft: EmailComposeDraft;
  findings: SmartSendFinding[];
  sending: boolean;
  rewriteEnabled: boolean;
  scheduleEnabled: boolean;
  smartValidation: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onRewrite: (style: EmailAiRewriteStyle) => void;
  onShorten: () => void;
  onLengthen: () => void;
  onSchedule: (hint: "tomorrow" | "next_monday") => void;
  onCancel: () => void;
}) {
  const { intent, draft } = props;
  const spam = estimateSpamScoreHint({
    subject: draft.subject,
    body: draft.body,
  });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-200" aria-hidden />
          <p className="text-sm font-semibold text-zinc-50">Smart Preview</p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{intent.assistantMessage}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-inner">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                Recipients
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {intent.recipients.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-700"
                  >
                    <Check className="h-3 w-3 text-emerald-400" aria-hidden />
                    {recipientChipLabel(r)}
                    {r.email ? (
                      <span className="text-zinc-500">{r.email}</span>
                    ) : null}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                Subject
              </dt>
              <dd className="mt-1 font-medium text-zinc-50">{draft.subject}</dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Priority
                </dt>
                <dd className="mt-1 text-zinc-200">{intent.urgencyLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Category
                </dt>
                <dd className="mt-1 text-zinc-200">{intent.category}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Language
                </dt>
                <dd className="mt-1 text-zinc-200">
                  {intent.language} → English
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Estimated Delivery
                </dt>
                <dd className="mt-1 text-zinc-200">{intent.estimatedDelivery}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Attachments
                </dt>
                <dd className="mt-1 text-zinc-200">None</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  Schedule
                </dt>
                <dd className="mt-1 text-zinc-200">
                  {draft.scheduledFor
                    ? new Date(draft.scheduledFor).toLocaleString()
                    : "Send now"}
                </dd>
              </div>
              {props.smartValidation ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                    Spam score hint
                  </dt>
                  <dd className="mt-1 text-zinc-200">
                    {spam.score}/100 · {spam.label}
                  </dd>
                </div>
              ) : null}
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                Professional Preview
              </dt>
              <dd className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm leading-relaxed text-zinc-300">
                {draft.body}
              </dd>
            </div>
          </dl>
        </div>

        {props.rewriteEnabled ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              Executive actions
            </p>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-zinc-800 text-[11px] text-zinc-300"
                onClick={props.onShorten}
              >
                Shorter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-zinc-800 text-[11px] text-zinc-300"
                onClick={props.onLengthen}
              >
                Longer
              </Button>
              {EMAIL_AI_REWRITE_STYLES.map((style) => (
                <Button
                  key={style}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-zinc-800 text-[11px] text-zinc-300"
                  onClick={() => props.onRewrite(style)}
                >
                  {EMAIL_AI_REWRITE_LABELS[style]}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-zinc-800 text-[11px] text-zinc-300"
                onClick={() => props.onRewrite("professional")}
              >
                Translate
              </Button>
            </div>
          </div>
        ) : null}

        {props.scheduleEnabled ? (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-zinc-800 text-[11px] text-zinc-300"
              onClick={() => props.onSchedule("tomorrow")}
            >
              Tomorrow 9:00
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-zinc-800 text-[11px] text-zinc-300"
              onClick={() => props.onSchedule("next_monday")}
            >
              Next Monday
            </Button>
          </div>
        ) : null}

        {props.findings.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-400/90">
              Warnings
            </p>
            {props.findings.map((f) => (
              <p
                key={f.id}
                className={cn(
                  "text-xs",
                  f.severity === "error"
                    ? "text-red-300"
                    : f.severity === "warning"
                      ? "text-amber-300"
                      : "text-zinc-400",
                )}
              >
                {f.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-500"
          onClick={props.onCancel}
          disabled={props.sending}
        >
          Cancel
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent text-zinc-200"
            onClick={props.onEdit}
            disabled={props.sending}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent text-zinc-200"
            onClick={props.onRegenerate}
            disabled={props.sending}
          >
            Regenerate
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-w-[160px] bg-zinc-100 text-zinc-950 hover:bg-white"
            onClick={props.onConfirm}
            disabled={
              props.sending ||
              intent.recipients.length === 0 ||
              (props.smartValidation &&
                props.findings.some((f) => f.severity === "error"))
            }
          >
            {props.sending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            {props.sending ? "Sending…" : "Confirm & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DisambiguationPanel(props: {
  intent: AiEmailIntentResult;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-50">
          Which person did you mean?
        </p>
        <p className="mt-1 text-xs text-zinc-500">{props.intent.assistantMessage}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {props.intent.ambiguousCandidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            onClick={() => props.onSelect(candidate.id)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-50">
                {candidate.label}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {candidate.email ?? "No email on file"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-zinc-400">Select</span>
          </button>
        ))}
      </div>
      <div className="border-t border-zinc-800 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-500"
          onClick={props.onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function UnresolvedRecipientPanel(props: {
  intent: AiEmailIntentResult;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-semibold text-zinc-50">Recipient not found</p>
      <p className="max-w-sm text-sm text-zinc-500">
        {props.intent.assistantMessage}
      </p>
      <Button
        type="button"
        size="sm"
        className="bg-zinc-100 text-zinc-950 hover:bg-white"
        onClick={props.onRetry}
      >
        Try again
      </Button>
    </div>
  );
}

function DeliverySuccessPanel(props: {
  status: {
    subject: string;
    recipients: string;
    queued: boolean;
    processed: boolean;
    sentAt: string;
    auditLogged: boolean;
  };
  onDismiss: () => void;
  onAskAgain: () => void;
}) {
  const sentLabel = new Date(props.status.sentAt).toLocaleString();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
        <Check className="h-7 w-7 text-emerald-400" aria-hidden />
      </div>
      <div className="max-w-lg space-y-3">
        <p className="text-base font-semibold tracking-tight text-zinc-50">
          ✅ Email Sent Successfully
        </p>
        <dl className="mx-auto grid max-w-md gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Recipient</dt>
            <dd className="text-zinc-200">{props.status.recipients}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Subject</dt>
            <dd className="text-zinc-200">{props.status.subject}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Delivery Status</dt>
            <dd className="text-emerald-300">
              {props.status.processed ? "Delivered" : "Queued"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Queue Status</dt>
            <dd className="text-zinc-200">
              {props.status.processed
                ? "Processed via emailService"
                : "Pending processing"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Time</dt>
            <dd className="text-zinc-200">{sentLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Audit Logged</dt>
            <dd className="text-emerald-300">
              {props.status.auditLogged ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-zinc-100 text-zinc-950 hover:bg-white"
          onClick={props.onAskAgain}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Ask AI again
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-transparent text-zinc-300"
          onClick={props.onDismiss}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

const AI_ASSIST_ACTIONS: Array<{
  action: SmartEmailAction;
  label: string;
  icon?: typeof Sparkles;
}> = [
  { action: "summarize_thread", label: "Summarize" },
  { action: "translate", label: "Translate", icon: Languages },
  { action: "rewrite", label: "Rewrite" },
  { action: "improve_tone", label: "Improve Tone" },
  { action: "shorten", label: "Shorten" },
  { action: "expand", label: "Expand" },
  { action: "ask_ai", label: "Generate Reply" },
  { action: "reply_professional", label: "Reply Professionally" },
  { action: "reply_friendly", label: "Reply Friendly" },
  { action: "reply_formal", label: "Reply Formal" },
];

function ViewerPanel(props: {
  message: EmailMessage;
  threadMessages: EmailMessage[];
  threadsEnabled: boolean;
  aiEnabled: boolean;
  smartReplyEnabled: boolean;
  scheduleEnabled: boolean;
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onAskAi: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onSchedule: () => void;
  onSmartAction: (action: SmartEmailAction) => void;
}) {
  const { message } = props;
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-400 md:hidden"
          onClick={props.onBack}
        >
          ← Back
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-300"
          onClick={props.onReply}
        >
          <Reply className="mr-1 h-3.5 w-3.5" />
          Reply
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-300"
          onClick={props.onReplyAll}
        >
          <ReplyAll className="mr-1 h-3.5 w-3.5" />
          Reply All
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-300"
          onClick={props.onForward}
        >
          <Forward className="mr-1 h-3.5 w-3.5" />
          Forward
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-300"
          onClick={props.onAskAi}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Ask AI
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-400"
          onClick={props.onArchive}
        >
          <Archive className="mr-1 h-3.5 w-3.5" />
          Archive
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-400"
          onClick={props.onDelete}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
        {props.scheduleEnabled ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-zinc-400"
            onClick={props.onSchedule}
          >
            Schedule
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-400"
          onClick={props.onToggleStar}
        >
          <Star
            className={cn(
              "mr-1 h-3.5 w-3.5",
              message.isStarred && "fill-amber-400 text-amber-400",
            )}
          />
          Star
        </Button>
      </div>

      {props.aiEnabled ? (
        <div className="flex flex-wrap gap-1 border-b border-zinc-800/80 px-2 py-1.5">
          {AI_ASSIST_ACTIONS.filter(
            (item) =>
              props.smartReplyEnabled ||
              (item.action !== "reply_professional" &&
                item.action !== "reply_friendly" &&
                item.action !== "reply_formal" &&
                item.action !== "ask_ai"),
          ).map((item) => {
            const Icon = item.icon ?? Sparkles;
            return (
              <Button
                key={item.action}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-zinc-800 bg-zinc-900/50 text-[11px] text-zinc-300"
                onClick={() => {
                  if (item.action === "summarize_thread") {
                    const result = applySmartEmailAction("summarize_thread", {
                      subject: message.subject,
                      body: message.body,
                      threadBodies: props.threadMessages.map((m) => m.body),
                    });
                    setSummary(result.body);
                    props.onSmartAction(item.action);
                    return;
                  }
                  props.onSmartAction(item.action);
                }}
              >
                <Icon className="mr-1 h-3 w-3" />
                {item.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
          {message.subject}
        </h2>
        <dl className="mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-[4.5rem_1fr]">
          <dt className="font-medium text-zinc-600">From</dt>
          <dd className="text-zinc-300">
            {message.fromName} &lt;{message.fromEmail}&gt;
          </dd>
          <dt className="font-medium text-zinc-600">To</dt>
          <dd className="text-zinc-300">{message.to.join(", ") || "—"}</dd>
          {message.cc.length > 0 ? (
            <>
              <dt className="font-medium text-zinc-600">CC</dt>
              <dd className="text-zinc-300">{message.cc.join(", ")}</dd>
            </>
          ) : null}
          <dt className="font-medium text-zinc-600">Date</dt>
          <dd className="text-zinc-300">
            {new Date(message.createdAt).toLocaleString()}
          </dd>
        </dl>

        {message.attachments.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <Badge
                key={att.id}
                variant="outline"
                className="gap-1 border-zinc-700 text-zinc-300"
              >
                <Paperclip className="h-3 w-3" />
                {att.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {summary ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              AI Summary
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
              {summary}
            </pre>
          </div>
        ) : null}

        {props.threadsEnabled && props.threadMessages.length > 1 ? (
          <div className="mt-6 space-y-4">
            {props.threadMessages.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-3"
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-200">
                    {item.fromName}
                  </span>
                  <span>{formatRelativeTime(item.createdAt)}</span>
                </header>
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
                  {item.body}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
            {message.body}
          </pre>
        )}
      </div>
    </div>
  );
}

function ComposePanel(props: {
  draft: EmailComposeDraft;
  setDraft: Dispatch<SetStateAction<EmailComposeDraft | null>>;
  aiEnabled: boolean;
  templatesEnabled: boolean;
  scheduleEnabled: boolean;
  templates: Array<{
    code: string;
    name: string;
    subject: string;
    bodyTemplate: string;
  }>;
  recipientCatalog: RecipientCandidate[];
  smartSendFindings: SmartSendFinding[];
  onClose: () => void;
  onSend: () => void;
  onPreview: () => void;
  onAiStyle: (style: EmailDraftStyle) => void;
  onApplyTemplate: (preset: (typeof EMAIL_TEMPLATE_PRESETS)[number]) => void;
  onSmartAction: (action: SmartEmailAction) => void;
  sending: boolean;
}) {
  const { draft, setDraft } = props;
  const [showCc, setShowCc] = useState(
    Boolean(draft.cc) || Boolean(draft.bcc),
  );
  const suggestions = useMemo(
    () =>
      props.aiEnabled
        ? getSmartComposeSuggestions({
            body: draft.body,
            subject: draft.subject,
          })
        : [],
    [props.aiEnabled, draft.body, draft.subject],
  );

  const resolvedChips = useMemo(
    () => resolveRecipientsFromQuery(draft.to, props.recipientCatalog).matched,
    [draft.to, props.recipientCatalog],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <p className="text-sm font-semibold text-zinc-50">Compose</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-500"
          onClick={props.onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <Field
          label="To"
          value={draft.to}
          onChange={(to) => setDraft({ ...draft, to })}
          placeholder="name, team, department, or email"
        />
        {resolvedChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pl-16">
            {resolvedChips.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-200"
              >
                <Check className="h-3 w-3 text-emerald-400" />
                {recipientChipLabel(r)}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="text-[11px] text-zinc-500 hover:text-zinc-300"
          onClick={() => setShowCc((v) => !v)}
        >
          {showCc ? "Hide CC / BCC" : "CC / BCC"}
        </button>
        {showCc ? (
          <>
            <Field
              label="CC"
              value={draft.cc}
              onChange={(cc) => setDraft({ ...draft, cc })}
            />
            <Field
              label="BCC"
              value={draft.bcc}
              onChange={(bcc) => setDraft({ ...draft, bcc })}
            />
          </>
        ) : null}
        <Field
          label="Subject"
          value={draft.subject}
          onChange={(subject) => setDraft({ ...draft, subject })}
        />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-zinc-500">
            Priority
            <select
              className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-zinc-200"
              value={draft.priority}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priority: e.target.value as EmailPriority,
                })
              }
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          {props.scheduleEnabled ? (
            <label className="flex items-center gap-1 text-zinc-500">
              Schedule
              <Input
                type="datetime-local"
                className="h-8 w-auto border-zinc-800 bg-zinc-900 text-xs text-zinc-200"
                value={
                  draft.scheduledFor
                    ? new Date(draft.scheduledFor).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    scheduledFor: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
          ) : null}
        </div>

        {props.templatesEnabled ? (
          <div className="flex flex-wrap gap-1">
            {EMAIL_TEMPLATE_PRESETS.map((preset) => (
              <Button
                key={preset.code}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-300"
                onClick={() => props.onApplyTemplate(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        ) : null}

        {props.aiEnabled ? (
          <div className="flex flex-wrap gap-1">
            {EMAIL_DRAFT_STYLES.slice(0, 8).map((style) => (
              <Button
                key={style}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-zinc-400"
                onClick={() => props.onAiStyle(style)}
              >
                AI · {EMAIL_DRAFT_STYLE_LABELS[style]}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-zinc-400"
              onClick={() => props.onSmartAction("grammar_fix")}
            >
              Grammar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-zinc-400"
              onClick={() => props.onSmartAction("improve_tone")}
            >
              Improve Tone
            </Button>
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              Smart Compose
            </p>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((s: SmartComposeSuggestion) => (
                <button
                  key={s.id}
                  type="button"
                  className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      body: `${draft.body}${s.insert}`,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                >
                  {s.label.length > 42 ? `${s.label.slice(0, 40)}…` : s.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Textarea
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          rows={14}
          className="min-h-[220px] resize-y border-zinc-800 bg-zinc-900/60 font-sans text-sm text-zinc-100"
          placeholder="Write your message…"
          aria-label="Email body"
        />

        {props.smartSendFindings.length > 0 ? (
          <div className="space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
            {props.smartSendFindings.map((f) => (
              <p
                key={f.id}
                className={cn(
                  "text-[11px]",
                  f.severity === "error"
                    ? "text-red-300"
                    : f.severity === "warning"
                      ? "text-amber-300"
                      : "text-zinc-400",
                )}
              >
                {f.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-zinc-700 bg-transparent text-zinc-300"
          onClick={props.onClose}
        >
          Save draft
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent text-zinc-200"
            onClick={props.onPreview}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-zinc-100 text-zinc-950 hover:bg-white"
            onClick={props.onSend}
            disabled={props.sending || !draft.to.trim()}
          >
            {props.sending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            {draft.scheduledFor && props.scheduleEnabled
              ? "Schedule Send"
              : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 font-medium text-zinc-500">
        {props.label}
      </span>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="h-8 border-zinc-800 bg-zinc-900 text-sm text-zinc-100"
      />
    </label>
  );
}

/** Page shell for Communication → Email (workspace or automation fallback). */
export function EmailWorkspacePageContent() {
  const workspace =
    isCommunicationEmailWorkspaceEnabled() || isEmailAiExecutiveAnyEnabled();

  if (!workspace) {
    return null;
  }

  return (
    <div className="relative space-y-0">
      <div className="mb-3 hidden sm:block">
        <PageHeader
          title="Email"
          description="Executive Assistant Email Agent — confirm before send on existing emailService."
        />
      </div>
      <EmailWorkspace />
    </div>
  );
}
