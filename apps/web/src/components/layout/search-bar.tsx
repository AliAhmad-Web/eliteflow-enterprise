"use client";

import type { GlobalSearchHit, GlobalSearchResponse } from "@enterprise/shared";
import {
  Building2,
  CheckSquare,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquareText,
  Bell,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiClientError } from "@/services/api/api-error";
import { MEDIA_QUERIES } from "@/lib/breakpoints";
import { cn } from "@/lib/utils";
import {
  SEARCH_GROUP_LABELS,
  flattenSearchHits,
  useDebouncedValue,
  useGlobalSearch,
} from "@/features/search/hooks/use-global-search";

const GROUP_ICONS = {
  users: UserRound,
  employees: Users,
  clients: Building2,
  projects: FolderKanban,
  tasks: CheckSquare,
  files: FileText,
  messages: MessageSquareText,
  notifications: Bell,
} as const;

function SearchResultsPanel({
  q,
  debouncedQ,
  data,
  isFetching,
  isError,
  error,
  activeIndex,
  onHover,
  onSelect,
  listId,
}: {
  q: string;
  debouncedQ: string;
  data: GlobalSearchResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (hit: GlobalSearchHit) => void;
  listId: string;
}) {
  if (!debouncedQ) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        Search people, clients, projects, tasks, files, messages, and more.
      </p>
    );
  }

  if (isFetching && !data) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Searching…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="px-3 py-6 text-center text-sm text-destructive">
        {error instanceof ApiClientError
          ? error.message
          : "Search failed. Please try again."}
      </p>
    );
  }

  if (data && data.total === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        No results for “{debouncedQ}”.
      </p>
    );
  }

  let runningIndex = -1;

  return (
    <div
      id={listId}
      role="listbox"
      aria-label="Search results"
      className="max-h-[min(24rem,60vh)] overflow-y-auto py-1"
    >
      {(
        Object.keys(SEARCH_GROUP_LABELS) as Array<
          keyof GlobalSearchResponse["groups"]
        >
      ).map((groupKey) => {
        const items = data?.groups[groupKey] ?? [];
        if (!items.length) return null;
        const Icon = GROUP_ICONS[groupKey];
        return (
          <div key={groupKey} className="px-1 pb-1">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {SEARCH_GROUP_LABELS[groupKey]}
            </p>
            <ul className="space-y-0.5">
              {items.map((hit) => {
                runningIndex += 1;
                const index = runningIndex;
                const active = index === activeIndex;
                return (
                  <li key={`${hit.type}-${hit.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      id={`search-option-${index}`}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/70",
                      )}
                      onMouseEnter={() => onHover(index)}
                      onClick={() => onSelect(hit)}
                    >
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {hit.title}
                        </span>
                        {hit.subtitle ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {isFetching ? (
        <p className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          Updating results…
        </p>
      ) : null}
      {q.trim() !== debouncedQ ? (
        <p className="px-3 py-1 text-center text-[11px] text-muted-foreground">
          Typing…
        </p>
      ) : null}
    </div>
  );
}

export function SearchBar({
  className,
  placeholder = "Search EliteFlow…",
}: {
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const desktopInputId = useId();
  const mobileInputId = useId();
  const listId = useId();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 280);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const searchEnabled = open || mobileOpen;
  const { data, isFetching, isError, error } = useGlobalSearch(
    debouncedQuery,
    searchEnabled,
  );
  const flatHits = useMemo(() => flattenSearchHits(data), [data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, data?.total]);

  useEffect(() => {
    if (!mobileOpen) return;
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
        setOpen(true);
        return;
      }
      setMobileOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        desktopInputRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const navigateToHit = useCallback(
    (hit: GlobalSearchHit) => {
      setOpen(false);
      setMobileOpen(false);
      setQuery("");
      router.push(hit.href);
    },
    [router],
  );

  const onKeyDownInput = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setMobileOpen(false);
      (event.target as HTMLInputElement).blur();
      return;
    }

    if (!flatHits.length) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatHits.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatHits.length) % flatHits.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = flatHits[activeIndex] ?? flatHits[0];
      if (hit) navigateToHit(hit);
    }
  };

  const resultsProps = {
    q: query,
    debouncedQ: debouncedQuery,
    data,
    isFetching,
    isError,
    error,
    activeIndex,
    onHover: setActiveIndex,
    onSelect: navigateToHit,
    listId,
  };

  return (
    <>
      <div
        className={cn("relative hidden max-w-md flex-1 md:block", className)}
        ref={panelRef}
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
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && flatHits[activeIndex]
              ? `search-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDownInput}
          className="h-9 rounded-lg border-transparent bg-navbar-search pl-9 pr-16 shadow-none hover:border-border/60 focus-visible:border-ring/30 focus-visible:bg-card"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/50 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-4 text-muted-foreground lg:inline-block">
          Ctrl K
        </kbd>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
            <SearchResultsPanel {...resultsProps} />
          </div>
        ) : null}
      </div>

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
          <div className="space-y-3 p-4">
            <label htmlFor={mobileInputId} className="text-sm font-medium">
              Search EliteFlow
            </label>
            <Input
              ref={mobileInputRef}
              id={mobileInputId}
              type="search"
              role="combobox"
              aria-expanded={mobileOpen}
              aria-controls={listId}
              autoComplete="off"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDownInput}
            />
            <SearchResultsPanel {...resultsProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
