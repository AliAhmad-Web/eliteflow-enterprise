"use client";

import { Copy, Search, WrapText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TextViewerProps {
  text: string;
  fileName: string;
  language: string;
  onStatusChange?: (status: string) => void;
}

export function TextViewer({
  text,
  fileName,
  language,
  onStatusChange,
}: TextViewerProps) {
  const [wrap, setWrap] = useState(true);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const lines = useMemo(() => text.split(/\r?\n/), [text]);

  const matchCount = useMemo(() => {
    if (!query.trim()) return 0;
    try {
      return lines.filter((line) =>
        line.toLowerCase().includes(query.toLowerCase()),
      ).length;
    } catch {
      return 0;
    }
  }, [lines, query]);

  useEffect(() => {
    onStatusChange?.(`${lines.length} lines · ${language}`);
  }, [language, lines.length, onStatusChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyAll = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-zinc-950"
      role="region"
      aria-label={`Text viewer for ${fileName}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-900/90 px-3 py-1.5">
        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
          {language}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-200 hover:bg-white/10"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 text-xs text-zinc-200 hover:bg-white/10",
            wrap && "bg-white/10",
          )}
          onClick={() => setWrap((v) => !v)}
        >
          <WrapText className="h-4 w-4" />
          Wrap
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-200 hover:bg-white/10"
          onClick={() => void copyAll()}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
        <span className="ml-auto text-xs text-zinc-500">
          {lines.length} lines
        </span>
      </div>

      {searchOpen ? (
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in file…"
            className="h-8 border-white/10 bg-zinc-800 text-zinc-100"
            autoFocus
          />
          <span className="whitespace-nowrap text-xs text-zinc-500">
            {query ? `${matchCount} matches` : ""}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto font-mono text-[13px] leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => {
              const hit =
                query.trim().length > 0 &&
                line.toLowerCase().includes(query.toLowerCase());
              return (
                <tr
                  key={index}
                  className={cn(
                    "hover:bg-white/[0.03]",
                    hit && "bg-amber-500/15",
                  )}
                >
                  <td className="w-12 select-none border-r border-white/5 px-3 text-right text-zinc-600">
                    {index + 1}
                  </td>
                  <td
                    className={cn(
                      "px-4 text-zinc-200",
                      wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                    )}
                  >
                    {line || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
