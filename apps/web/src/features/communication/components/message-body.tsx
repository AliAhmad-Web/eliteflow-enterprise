"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { splitInlineRichText } from "../utils/mentions";
import { stripLinkMarkers } from "../utils/message-linked-records";
import {
  extractUrls,
  getLinkPreviewMeta,
  parseMessageContent,
} from "../utils/message-content";

interface MessageBodyProps {
  body: string;
  isOwn?: boolean;
  className?: string;
  /** Highlight the current user's display mention when present. */
  currentUserMentionLabels?: string[];
}

export function MessageBody({
  body,
  isOwn = false,
  className,
  currentUserMentionLabels = [],
}: MessageBodyProps) {
  const displayBody = stripLinkMarkers(body);
  const parts = parseMessageContent(displayBody);
  const urls = extractUrls(displayBody);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="whitespace-pre-wrap break-words text-[13.5px] leading-5">
        {parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return (
                <RichTextChunk
                  key={index}
                  text={part.value}
                  isOwn={isOwn}
                  currentUserMentionLabels={currentUserMentionLabels}
                />
              );
            case "inline-code":
              return (
                <code
                  key={index}
                  className={cn(
                    "rounded px-1 py-0.5 font-mono text-[12px]",
                    isOwn
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-background/80 text-foreground",
                  )}
                >
                  {part.value}
                </code>
              );
            case "code":
              return (
                <CodeBlock
                  key={index}
                  code={part.value}
                  language={part.language}
                  isOwn={isOwn}
                />
              );
            default: {
              const _exhaustive: never = part;
              return _exhaustive;
            }
          }
        })}
      </div>

      {urls.length > 0 ? (
        <div className="space-y-1.5">
          {urls.slice(0, 3).map((url) => (
            <LinkPreviewCard key={url} url={url} isOwn={isOwn} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RichTextChunk({
  text,
  isOwn,
  currentUserMentionLabels,
}: {
  text: string;
  isOwn: boolean;
  currentUserMentionLabels: string[];
}) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) nodes.push("\n");

    if (line.startsWith("> ")) {
      nodes.push(
        <span
          key={`q-${lineIndex}`}
          className={cn(
            "my-0.5 block border-l-2 pl-2.5 text-[12.5px] italic leading-5",
            isOwn
              ? "border-primary-foreground/40 text-primary-foreground/85"
              : "border-primary/40 text-muted-foreground",
          )}
        >
          <InlineSegments
            text={line.slice(2)}
            isOwn={isOwn}
            currentUserMentionLabels={currentUserMentionLabels}
          />
        </span>,
      );
      return;
    }

    nodes.push(
      <InlineSegments
        key={`t-${lineIndex}`}
        text={line}
        isOwn={isOwn}
        currentUserMentionLabels={currentUserMentionLabels}
      />,
    );
  });

  return <>{nodes}</>;
}

function InlineSegments({
  text,
  isOwn,
  currentUserMentionLabels,
}: {
  text: string;
  isOwn: boolean;
  currentUserMentionLabels: string[];
}) {
  const selfLabels = new Set(
    currentUserMentionLabels.map((label) => label.toLowerCase()),
  );

  return (
    <>
      {splitInlineRichText(text).map((segment, index) => {
        switch (segment.type) {
          case "text":
            return <span key={index}>{segment.value}</span>;
          case "url":
            return (
              <a
                key={index}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "break-all underline underline-offset-2",
                  isOwn
                    ? "text-primary-foreground/95 decoration-primary-foreground/50 hover:decoration-primary-foreground"
                    : "text-primary decoration-primary/40 hover:decoration-primary",
                )}
                onClick={(event) => event.stopPropagation()}
              >
                {segment.value}
              </a>
            );
          case "mention": {
            const isSelf = selfLabels.has(segment.label.toLowerCase());
            return (
              <span
                key={index}
                title={segment.userId ? `User ${segment.userId}` : undefined}
                className={cn(
                  "rounded px-0.5 font-semibold",
                  isOwn
                    ? isSelf
                      ? "bg-primary-foreground/25 text-primary-foreground"
                      : "text-sky-100"
                    : isSelf
                      ? "bg-primary/15 text-primary"
                      : "text-primary",
                )}
              >
                @{segment.label}
              </span>
            );
          }
          case "quote":
            return (
              <span key={index} className="italic opacity-80">
                {segment.value}
              </span>
            );
          default: {
            const _exhaustive: never = segment;
            return _exhaustive;
          }
        }
      })}
    </>
  );
}

function CodeBlock({
  code,
  language,
  isOwn,
}: {
  code: string;
  language?: string;
  isOwn: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={cn(
        "my-1 overflow-hidden rounded-lg border text-left",
        isOwn
          ? "border-primary-foreground/20 bg-black/25"
          : "border-border bg-background",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-inherit px-2.5 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
          {language || "code"}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] opacity-80 transition hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-2.5 font-mono text-[12px] leading-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LinkPreviewCard({ url, isOwn }: { url: string; isOwn: boolean }) {
  const meta = getLinkPreviewMeta(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "block overflow-hidden rounded-lg border transition-colors",
        isOwn
          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "border-border bg-background/80 hover:bg-accent/60",
      )}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        {meta.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.favicon}
            alt=""
            className="mt-0.5 h-5 w-5 shrink-0 rounded"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium opacity-70">
            {meta.hostname}
          </p>
          <p className="line-clamp-2 text-xs font-medium leading-4">{meta.title}</p>
          <p className="mt-0.5 truncate text-[11px] opacity-60">{url}</p>
        </div>
      </div>
    </a>
  );
}
