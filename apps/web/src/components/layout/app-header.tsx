"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

import { HeaderQuickActions } from "@/components/layout/header-quick-actions";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBar } from "@/components/layout/search-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import { cn } from "@/lib/utils";

const NotificationBell = dynamic(
  () =>
    import("@/features/notifications").then((m) => m.NotificationBell),
  { ssr: false, loading: () => <span className="inline-block size-9" aria-hidden /> },
);

interface AppHeaderProps {
  className?: string;
}

function AppHeaderComponent({ className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "glass-surface sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-navbar-border px-3 shadow-[var(--shadow-xs)] sm:h-16 sm:px-4 lg:px-6",
        className,
      )}
      role="banner"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MobileNav />
        <SearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <HeaderQuickActions />
        <NotificationBell />
        <ThemeToggle />
        <UserProfileMenu />
      </div>
    </header>
  );
}

export const AppHeader = memo(AppHeaderComponent);
