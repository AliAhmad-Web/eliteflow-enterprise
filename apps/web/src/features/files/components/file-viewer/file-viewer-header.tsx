"use client";

import type { ManagedFile } from "@enterprise/shared";
import {
  ArrowLeft,
  Download,
  Ellipsis,
  Heart,
  Info,
  PanelRight,
  Printer,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { FILE_CATEGORY_LABELS, formatBytes } from "../../types/files.types";
import {
  categoryIconLabel,
  formatFileDate,
} from "./file-viewer.utils";

interface FileViewerHeaderProps {
  file: ManagedFile;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBack: () => void;
  onDownload: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onPrint: () => void;
  canWrite: boolean;
  favoritePending?: boolean;
}

export function FileViewerHeader({
  file,
  sidebarOpen,
  onToggleSidebar,
  onBack,
  onDownload,
  onShare,
  onFavorite,
  onPrint,
  canWrite,
  favoritePending,
}: FileViewerHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1.5"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary sm:flex">
            {categoryIconLabel(file.category).slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {file.name}
              </h1>
              <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                v{file.version}
              </span>
            </div>
            <nav
              className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href={ROUTES.FILE_MANAGER} className="hover:text-foreground">
                Workspace
              </Link>
              <span aria-hidden>/</span>
              <Link href={ROUTES.FILE_MANAGER} className="hover:text-foreground">
                Files
              </Link>
              <span aria-hidden>/</span>
              <span className="truncate text-foreground/80">{file.name}</span>
            </nav>
          </div>
        </div>

        <div className="hidden items-center gap-3 text-[11px] text-muted-foreground lg:flex">
          <span>{FILE_CATEGORY_LABELS[file.category]}</span>
          <span aria-hidden>·</span>
          <span>{formatBytes(file.sizeBytes)}</span>
          <span aria-hidden>·</span>
          <span title="Last modified">
            Modified {formatFileDate(file.updatedAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canWrite ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              aria-label={file.isFavorite ? "Remove favorite" : "Favorite"}
              disabled={favoritePending}
              onClick={onFavorite}
            >
              {file.isFavorite ? (
                <Heart className="h-4 w-4 fill-current text-primary" />
              ) : (
                <Star className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              aria-label="Share"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            aria-label="Download"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="hidden h-9 w-9 sm:inline-flex"
            aria-label="Print"
            onClick={onPrint}
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("h-9 w-9", sidebarOpen && "bg-muted")}
            aria-label={sidebarOpen ? "Hide details" : "Show details"}
            aria-pressed={sidebarOpen}
            onClick={onToggleSidebar}
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                aria-label="More actions"
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="h-4 w-4" />
                Print
              </DropdownMenuItem>
              {canWrite ? (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleSidebar}>
                <Info className="h-4 w-4" />
                {sidebarOpen ? "Hide details" : "File details"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
