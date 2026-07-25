"use client";

import { Search, Settings, Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  SETTINGS_NAV,
  type SettingsSectionId,
} from "../constants/settings-nav";
import { useSettingsOverview } from "../hooks/use-settings";
import { SettingsSectionPanel } from "./settings-sections";

const SETTINGS_TAB_STORAGE_KEY = "eliteflow-settings-tab";

function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return Boolean(value && SETTINGS_NAV.some((item) => item.id === value));
}

function persistSettingsTab(tab: SettingsSectionId): void {
  try {
    window.sessionStorage.setItem(SETTINGS_TAB_STORAGE_KEY, tab);
  } catch {
    // Ignore storage failures.
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("tab") === tab) return;
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export function SettingsCenterPageContent() {
  const searchParams = useSearchParams();
  const overviewQuery = useSettingsOverview();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<SettingsSectionId>("profile");
  const [dirty, setDirty] = useState(false);
  const [tabReady, setTabReady] = useState(false);

  useLayoutEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (isSettingsSectionId(fromUrl)) {
      setSection(fromUrl);
      setTabReady(true);
      return;
    }

    try {
      const stored = window.sessionStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
      if (isSettingsSectionId(stored)) {
        setSection(stored);
        persistSettingsTab(stored);
      }
    } catch {
      // Ignore storage failures.
    }
    setTabReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!tabReady) return;
    const tab = searchParams.get("tab");
    if (isSettingsSectionId(tab) && tab !== section) {
      setSection(tab);
    }
  }, [searchParams, section, tabReady]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const navItems = useMemo(() => {
    const canOrg = overviewQuery.data?.canManageOrganization ?? false;
    const q = search.trim().toLowerCase();
    return SETTINGS_NAV.filter((item) => {
      if (item.orgOnly && !canOrg) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [overviewQuery.data?.canManageOrganization, search]);

  useEffect(() => {
    if (navItems.length && !navItems.some((item) => item.id === section)) {
      const next = navItems[0]!.id;
      setSection(next);
      persistSettingsTab(next);
    }
  }, [navItems, section]);

  function selectSection(next: SettingsSectionId) {
    if (next === section) return;
    if (
      dirty &&
      !window.confirm(
        "You have unsaved changes. Leave this section without saving?",
      )
    ) {
      return;
    }
    setDirty(false);
    setSection(next);
    persistSettingsTab(next);
  }

  // Never block the shell with a full-page spinner when cache/placeholder exists.
  // Background refetch updates sections via React Query.
  if (overviewQuery.isError && !overviewQuery.data) {
    const denied =
      overviewQuery.error instanceof ApiClientError &&
      overviewQuery.error.status === 403;
    if (denied) {
      return (
        <EmptyState
          icon={Shield}
          title="Permission denied"
          description="You do not have access to settings."
        />
      );
    }
    return (
      <ErrorState
        title="Unable to load settings"
        description={
          overviewQuery.error instanceof ApiClientError
            ? overviewQuery.error.message
            : "Please try again."
        }
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  if (!overviewQuery.data) {
    // Soft placeholder layout (no spinner) while first fetch completes.
    return (
      <div className="space-y-8">
        <PageHeader
          title="Settings Center"
          description="Manage profile, organization, appearance, and integrations."
        />
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-64 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings Center"
        description="Manage profile, organization, appearance, and integrations."
      />

      {dirty ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          You have unsaved changes in this section.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search settings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search settings"
            />
          </div>

          {/* Mobile / tablet: compact section picker */}
          <label className="block space-y-1.5 lg:hidden">
            <span className="text-xs font-medium text-muted-foreground">
              Settings section
            </span>
            <select
              className="flex h-11 w-full touch-target-auto rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              value={section}
              onChange={(e) =>
                selectSection(e.target.value as SettingsSectionId)
              }
              aria-label="Select settings section"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <nav
            className="hidden space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm lg:block"
            aria-label="Settings sections"
          >
            {navItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching settings
              </p>
            ) : (
              navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    section === item.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/60",
                  )}
                  aria-current={section === item.id ? "page" : undefined}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </button>
              ))
            )}
          </nav>
        </aside>

        <div
          className="min-w-0"
          onChangeCapture={() => setDirty(true)}
          onInputCapture={() => setDirty(true)}
          onSubmitCapture={() => setDirty(false)}
        >
          <SettingsSectionPanel section={section} data={overviewQuery.data} />
        </div>
      </div>
    </div>
  );
}
