"use client";

import { Gem, Leaf, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";

const THEME_OPTIONS = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
  { id: "emerald", label: "Emerald", Icon: Leaf },
  { id: "sapphire", label: "Sapphire", Icon: Gem },
] as const;

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Sun strokeWidth={1.75} />
      </Button>
    );
  }

  const isDarkLike = theme === "dark";
  const isEmerald = theme === "emerald";
  const isSapphire = theme === "sapphire";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Toggle theme"
        >
          <Sun
            className={
              isDarkLike || isEmerald || isSapphire
                ? "scale-0 rotate-90 opacity-0"
                : "scale-100 rotate-0 opacity-100"
            }
            strokeWidth={1.75}
            style={{ transition: "transform 150ms ease, opacity 150ms ease" }}
          />
          <Moon
            className={`absolute inset-0 m-auto size-4 ${
              isDarkLike
                ? "scale-100 rotate-0 opacity-100"
                : "scale-0 -rotate-90 opacity-0"
            }`}
            strokeWidth={1.75}
            style={{ transition: "transform 150ms ease, opacity 150ms ease" }}
          />
          <Leaf
            className={`absolute inset-0 m-auto size-4 text-emerald-600 ${
              isEmerald
                ? "scale-100 rotate-0 opacity-100"
                : "scale-0 opacity-0"
            }`}
            strokeWidth={1.75}
            style={{ transition: "transform 150ms ease, opacity 150ms ease" }}
          />
          <Gem
            className={`absolute inset-0 m-auto size-4 text-blue-600 ${
              isSapphire
                ? "scale-100 rotate-0 opacity-100"
                : "scale-0 opacity-0"
            }`}
            strokeWidth={1.75}
            style={{ transition: "transform 150ms ease, opacity 150ms ease" }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEME_OPTIONS.slice(0, 3).map(({ id, label, Icon }) => (
          <DropdownMenuItem key={id} onClick={() => setTheme(id)}>
            <Icon className="icon-glyph-sm" strokeWidth={1.75} />
            {label}
            {theme === id ? (
              <span className="ml-auto text-primary">✓</span>
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {THEME_OPTIONS.slice(3).map(({ id, label, Icon }) => (
          <DropdownMenuItem key={id} onClick={() => setTheme(id)}>
            <Icon className="icon-glyph-sm" strokeWidth={1.75} />
            {label}
            {theme === id ? (
              <span className="ml-auto text-primary">✓</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
