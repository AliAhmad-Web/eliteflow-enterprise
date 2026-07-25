"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/** Lightweight Markdown renderer for AI responses (no extra dependency). */
export function MarkdownView({ content, className }: MarkdownViewProps) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-foreground [&_strong]:font-semibold",
        className,
      )}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <p
                key={index}
                className={cn(
                  "font-semibold text-foreground",
                  block.level === 1 && "text-lg",
                  block.level === 2 && "text-base",
                  block.level >= 3 && "text-sm",
                )}
              >
                {renderInline(block.text)}
              </p>
            );
          case "code":
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded-lg border border-border/50 bg-muted/40 p-3 font-mono text-xs"
              >
                <code>{block.text}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-primary/40 pl-3 text-muted-foreground"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case "list":
            return (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "paragraph":
            return <p key={index}>{renderInline(block.text)}</p>;
          default: {
            const _exhaustive: never = block;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "code"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim().startsWith("```")) {
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      blocks.push({ type: "code", text: codeLines.join("\n") });
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (line.trim().startsWith(">")) {
      blocks.push({
        type: "quote",
        text: line.replace(/^\s*>\s?/, ""),
      });
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,3})\s+/.test(lines[i] ?? "") &&
      !(lines[i] ?? "").trim().startsWith("```") &&
      !(lines[i] ?? "").trim().startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i] ?? "")
    ) {
      paragraph.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
