"use client";

import { COMMON_EMOJIS } from "../types/communication.types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

const EMOJI_CATEGORIES: Record<string, readonly string[]> = {
  Frequent: COMMON_EMOJIS.slice(0, 16),
  Smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😜", "🤔", "😎", "🤗", "🤩", "😏", "😢", "😭", "😤", "🤯"],
  Gestures: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤟", "👌", "🤏", "👊", "✊", "👋", "🫡", "💪", "🙏"],
  Objects: ["🔥", "✅", "❌", "⭐", "💯", "💡", "📌", "🔔", "💬", "📎", "🗂️", "✏️", "🚀", "🎉", "❤️", "🧡", "💛", "💚", "💙", "💜"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Frequent");

  const emojis = useMemo(() => {
    if (query.trim()) {
      return [...new Set(Object.values(EMOJI_CATEGORIES).flat())];
    }
    return EMOJI_CATEGORIES[category] ?? COMMON_EMOJIS;
  }, [category, query]);

  return (
    <div
      className={cn(
        "w-[280px] rounded-xl border border-border bg-popover p-2 shadow-lg",
        className,
      )}
      role="listbox"
      aria-label="Choose an emoji"
    >
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emoji…"
          className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {!query ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {Object.keys(EMOJI_CATEGORIES).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                category === name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto">
        {emojis.map((emoji) => (
          <button
            key={`${category}-${emoji}`}
            type="button"
            role="option"
            aria-selected={false}
            className="flex h-8 w-8 items-center justify-center rounded text-base transition-colors hover:bg-accent"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
