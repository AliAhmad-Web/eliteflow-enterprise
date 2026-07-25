"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MEDIA_QUERIES } from "@/lib/breakpoints";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({
  className,
  placeholder = "Search anything...",
  onSearch,
}: SearchBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const desktopInputId = useId();
  const mobileInputId = useId();

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();

      if (window.matchMedia(MEDIA_QUERIES.md).matches) {
        desktopInputRef.current?.focus();
        desktopInputRef.current?.select();
        return;
      }

      setMobileOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submitSearch = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    onSearch?.(String(formData.get("q") ?? "").trim());
  };

  return (
    <>
      <form
        className={cn("relative hidden max-w-md flex-1 md:flex", className)}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(e.currentTarget);
        }}
      >
        <label htmlFor={desktopInputId} className="sr-only">
          Search
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <Input
          ref={desktopInputRef}
          id={desktopInputId}
          name="q"
          type="search"
          placeholder={placeholder}
          className="h-9 rounded-lg border-transparent bg-navbar-search pl-9 pr-16 shadow-none hover:border-border/60 focus-visible:border-ring/30 focus-visible:bg-card"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/50 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-4 text-muted-foreground lg:inline-block">
          Ctrl K
        </kbd>
      </form>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open search"
        onClick={() => setMobileOpen(true)}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full max-w-none p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-4 p-4"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(e.currentTarget);
              setMobileOpen(false);
            }}
          >
            <div className="space-y-2">
              <label htmlFor={mobileInputId} className="text-sm font-medium">
                Search EliteFlow
              </label>
              <Input
                ref={mobileInputRef}
                id={mobileInputId}
                name="q"
                type="search"
                placeholder={placeholder}
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
