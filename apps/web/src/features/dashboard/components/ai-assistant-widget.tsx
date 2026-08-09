"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { Bot, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { QuickActionButtons } from "@/features/dashboard/components/quick-action-buttons";
import { AI_QUICK_ACTIONS } from "@/features/dashboard/config/quick-access.actions";
import { useAiChat } from "@/features/ai/hooks/use-ai-mutations";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

interface AiAssistantWidgetProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function AiAssistantWidget({
  title = "AI Assistant",
  subtitle = "Your smart business assistant",
  className,
}: AiAssistantWidgetProps) {
  const router = useRouter();
  const canUseAi = useHasPermission(PERMISSIONS.AI_USE);
  const chatMutation = useAiChat();
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState("");
  const [userText, setUserText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!canUseAi) {
    return null;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || chatMutation.isPending) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDraft("");
    setUserText(message);
    setAssistantText("");
    setErrorMessage(null);

    try {
      const result = await chatMutation.mutateAsync({
        input: {
          conversationId: conversationId ?? undefined,
          message,
          mode: "ASK",
        },
        signal: controller.signal,
        onMeta: (meta) => {
          setConversationId(meta.conversationId);
        },
        onDelta: (chunk) => {
          setAssistantText((current) => `${current}${chunk}`);
        },
      });

      setConversationId(result.conversation.id);
      if (result.assistantMessage?.content) {
        setAssistantText(result.assistantMessage.content);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "AI request failed. Please try again.",
      );
    }
  };

  const openFullAssistant = () => {
    const href = conversationId
      ? `${ROUTES.AI_ASSISTANT}?c=${encodeURIComponent(conversationId)}`
      : ROUTES.AI_ASSISTANT;
    router.push(href);
  };

  return (
    <Card
      className={cn(
        "ai-surface border-primary/20 shadow-[var(--shadow-glow-primary)]",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="icon-box icon-box-md rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <Bot className="text-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight">
              {title}
            </CardTitle>
            <p className="text-xs leading-4 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuickActionButtons actions={AI_QUICK_ACTIONS} variant="grid" />

        {(userText || assistantText || errorMessage || chatMutation.isPending) && (
          <div
            className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-primary/15 bg-background/60 p-3 text-xs"
            aria-live="polite"
          >
            {userText ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">You: </span>
                {userText}
              </p>
            ) : null}
            {chatMutation.isPending && !assistantText ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                Thinking…
              </p>
            ) : null}
            {assistantText ? (
              <p className="whitespace-pre-wrap text-foreground">
                <span className="font-medium">Assistant: </span>
                {assistantText}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="text-destructive">{errorMessage}</p>
            ) : null}
          </div>
        )}

        <form className="flex gap-2" onSubmit={onSubmit} aria-label="AI assistant prompt">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask anything..."
            className="border-primary/15 bg-background/70 focus-visible:border-primary/35"
            aria-label="Ask AI assistant"
            disabled={chatMutation.isPending}
            maxLength={8000}
          />
          <Button
            type="submit"
            size="icon"
            className="shadow-[var(--shadow-xs)]"
            aria-label="Send message"
            disabled={chatMutation.isPending || !draft.trim()}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={openFullAssistant}
          >
            Open AI Assistant
          </button>
          {conversationId ? (
            <>
              {" · "}
              <Link
                href={`${ROUTES.AI_ASSISTANT}?c=${encodeURIComponent(conversationId)}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                Continue conversation
              </Link>
            </>
          ) : null}
        </p>
      </CardContent>
    </Card>
  );
}
