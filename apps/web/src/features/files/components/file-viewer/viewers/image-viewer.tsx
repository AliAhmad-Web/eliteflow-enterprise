"use client";

import {
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  onZoomChange?: (zoom: number) => void;
  infoOpen?: boolean;
}

export function ImageViewer({
  url,
  fileName,
  mimeType,
  sizeBytes,
  onZoomChange,
  infoOpen = false,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(800, Math.max(25, Math.round(next)));
      setZoom(clamped);
      onZoomChange?.(clamped);
    },
    [onZoomChange],
  );

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [onZoomChange, zoom]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullscreen) {
        event.preventDefault();
        void document.exitFullscreen?.();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        applyZoom(zoom + 15);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        applyZoom(zoom - 15);
      }
      if (event.key === "0" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyZoom(100);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyZoom, fullscreen, zoom]);

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    setDragging(true);
    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragOrigin.current.ox + (event.clientX - dragOrigin.current.x),
      y: dragOrigin.current.oy + (event.clientY - dragOrigin.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col bg-zinc-950"
      role="region"
      aria-label={`Image viewer for ${fileName}`}
    >
      <div className="flex items-center gap-1 border-b border-white/10 bg-zinc-900/90 px-2 py-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-zinc-200 hover:bg-white/10"
          aria-label="Zoom out"
          onClick={() => applyZoom(zoom - 15)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-xs text-zinc-300">{zoom}%</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-zinc-200 hover:bg-white/10"
          aria-label="Zoom in"
          onClick={() => applyZoom(zoom + 15)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-zinc-200 hover:bg-white/10"
          aria-label="Rotate"
          onClick={() => setRotation((r) => (r + 90) % 360)}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-200 hover:bg-white/10"
          onClick={() => {
            applyZoom(100);
            setOffset({ x: 0, y: 0 });
            setRotation(0);
          }}
        >
          Reset
        </Button>
        <div className="ml-auto">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-200 hover:bg-white/10"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => applyZoom(zoom >= 200 ? 100 : zoom + 50)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={fileName}
            draggable={false}
            className="max-h-none max-w-none select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 120ms ease",
            }}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }}
          />
        </div>

        {infoOpen ? (
          <aside className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
            <p className="font-medium text-zinc-100">{fileName}</p>
            <p className="mt-1">
              {mimeType}
              {natural.w ? ` · ${natural.w}×${natural.h}` : ""}
            </p>
            <p>{(sizeBytes / 1024).toFixed(1)} KB · {zoom}%</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
