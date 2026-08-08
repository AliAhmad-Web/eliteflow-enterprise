"use client";

import {
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FitMode = "width" | "page" | "custom";

interface PdfViewerProps {
  url: string;
  fileName: string;
  onZoomChange?: (zoom: number) => void;
  onStatusChange?: (status: string) => void;
}

export function PdfViewer({
  url,
  fileName,
  onZoomChange,
  onStatusChange,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState<FitMode>("width");
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(300, Math.max(50, Math.round(next)));
      setZoom(clamped);
      setFit("custom");
      onZoomChange?.(clamped);
    },
    [onZoomChange],
  );

  useEffect(() => {
    onStatusChange?.("PDF ready");
    onZoomChange?.(zoom);
  }, [onStatusChange, onZoomChange, zoom]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullscreen) {
        event.preventDefault();
        void document.exitFullscreen?.();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setPage((p) => p + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setPage((p) => Math.max(1, p - 1));
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        applyZoom(zoom + 10);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        applyZoom(zoom - 10);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyZoom, fullscreen, zoom]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const scale =
    fit === "width" ? 1 : fit === "page" ? 0.85 : zoom / 100;

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col bg-zinc-950"
      role="region"
      aria-label={`PDF viewer for ${fileName}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-zinc-900/90 px-2 py-1.5 backdrop-blur">
        <ToolbarIcon
          label="Zoom out"
          onClick={() => applyZoom(zoom - 10)}
          icon={<ZoomOut className="h-4 w-4" />}
        />
        <span className="min-w-12 text-center text-xs text-zinc-300">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarIcon
          label="Zoom in"
          onClick={() => applyZoom(zoom + 10)}
          icon={<ZoomIn className="h-4 w-4" />}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
          onClick={() => {
            setFit("width");
            setZoom(100);
            onZoomChange?.(100);
          }}
        >
          Fit width
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
          onClick={() => {
            setFit("page");
            setZoom(85);
            onZoomChange?.(85);
          }}
        >
          Fit page
        </Button>
        <ToolbarIcon
          label="Rotate"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          icon={<RotateCw className="h-4 w-4" />}
        />
        <ToolbarIcon
          label="Search in document"
          onClick={() => setSearchOpen((v) => !v)}
          icon={<Search className="h-4 w-4" />}
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-zinc-200 hover:bg-white/10"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="px-1 text-xs text-zinc-400">Page {page}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-zinc-200 hover:bg-white/10"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
          <ToolbarIcon
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => void toggleFullscreen()}
            icon={
              fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )
            }
          />
        </div>
      </div>

      {searchOpen ? (
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-400" aria-hidden />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in PDF (browser find: Ctrl+F)"
            className="h-8 border-white/10 bg-zinc-800 text-zinc-100"
            autoFocus
          />
          <p className="hidden text-xs text-zinc-500 sm:block">
            Use browser find for in-document search
          </p>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div
          className="mx-auto flex min-h-full justify-center p-4 transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "top center",
            width: fit === "width" ? "100%" : undefined,
          }}
        >
          <iframe
            title={fileName}
            src={`${url}#page=${page}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
            className={cn(
              "h-[calc(100dvh-11rem)] w-full max-w-5xl rounded-md border border-white/10 bg-white shadow-2xl",
              fit === "width" && "max-w-none",
            )}
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarIcon({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-zinc-200 hover:bg-white/10 hover:text-white"
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}
