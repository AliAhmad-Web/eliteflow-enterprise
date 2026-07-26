"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

import {
  hitTest,
  renderDocument,
  captureThumbnail,
  exportDocument,
} from "../lib/canvas-engine";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  createId,
  type BrushSize,
  type WhiteboardDocument,
  type WhiteboardObject,
  type WhiteboardTool,
} from "../types/whiteboard.types";

export interface WhiteboardCanvasHandle {
  export: (format: "PNG" | "JPG" | "PDF" | "SVG") => Promise<void>;
  thumbnail: () => string;
  focus: () => void;
}

interface WhiteboardCanvasProps {
  document: WhiteboardDocument;
  tool: WhiteboardTool;
  color: string;
  brushSize: BrushSize;
  selectedIds: string[];
  onDocumentLive: (doc: WhiteboardDocument) => void;
  onCommit: (doc: WhiteboardDocument) => void;
  onSelect: (ids: string[]) => void;
  className?: string;
}

function readCssColor(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim() ||
    fallback
  );
}

function screenToWorld(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  doc: WhiteboardDocument,
) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - doc.viewport.x) / doc.viewport.zoom;
  const y = (clientY - rect.top - doc.viewport.y) / doc.viewport.zoom;
  return { x, y };
}

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas(
  {
    document: doc,
    tool,
    color,
    brushSize,
    selectedIds,
    onDocumentLive,
    onCommit,
    onSelect,
    className,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  const draftRef = useRef<WhiteboardObject | null>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null,
  );
  const dragRef = useRef<{
    ids: string[];
    originX: number;
    originY: number;
    starts: Record<string, { x: number; y: number }>;
  } | null>(null);
  const spacePanRef = useRef(false);
  const { resolvedTheme } = useTheme();

  docRef.current = doc;

  const background = readCssColor(
    "--card",
    resolvedTheme === "light" ? "#ffffff" : "#111114",
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(container.clientWidth));
    const height = Math.max(1, Math.floor(container.clientHeight));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderDocument(ctx, docRef.current, {
      width: canvas.width,
      height: canvas.height,
      dpr,
      background,
      selectedIds,
    });
  }, [background, selectedIds]);

  useEffect(() => {
    paint();
  }, [doc, paint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(container);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePanRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePanRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      export: (format) => exportDocument(docRef.current, format, background),
      thumbnail: () => captureThumbnail(docRef.current, background),
      focus: () => canvasRef.current?.focus(),
    }),
    [background],
  );

  const applyLive = (next: WhiteboardDocument) => {
    docRef.current = next;
    onDocumentLive(next);
    paint();
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = docRef.current;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, current.viewport.zoom * zoomFactor),
    );
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const worldX = (mx - current.viewport.x) / current.viewport.zoom;
    const worldY = (my - current.viewport.y) / current.viewport.zoom;
    const next = {
      ...current,
      viewport: {
        zoom: nextZoom,
        x: mx - worldX * nextZoom,
        y: my - worldY * nextZoom,
      },
    };
    applyLive(next);
  };

  const startShape = (world: { x: number; y: number }, type: WhiteboardObject["type"]) => {
    const zIndex = docRef.current.objects.length + 1;
    if (type === "path" || type === "highlighter" || type === "free-arrow") {
      return {
        id: createId(),
        type,
        x: world.x,
        y: world.y,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex,
        points: [0, 0],
        stroke: type === "highlighter" ? `${color}99` : color,
        strokeWidth: type === "highlighter" ? brushSize * 3 : brushSize,
      } satisfies WhiteboardObject;
    }
    if (type === "text" || type === "sticky") {
      return {
        id: createId(),
        type,
        x: world.x,
        y: world.y,
        width: type === "sticky" ? 180 : 160,
        height: type === "sticky" ? 140 : 48,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex,
        text: type === "sticky" ? "Sticky note" : "Text",
        fill: type === "sticky" ? "#fef08a" : "transparent",
        stroke: type === "sticky" ? "#ca8a04" : "transparent",
        fontSize: 16,
        color: "#0f172a",
      } satisfies WhiteboardObject;
    }
    return {
      id: createId(),
      type: type as Extract<
        WhiteboardObject,
        { type: "rect" | "circle" | "ellipse" | "line" | "arrow" | "dashed-line" }
      >["type"],
      x: world.x,
      y: world.y,
      width: 0,
      height: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
      zIndex,
      stroke: color,
      strokeWidth: brushSize,
      fill: "transparent",
    } satisfies WhiteboardObject;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const current = docRef.current;
    const world = screenToWorld(event.clientX, event.clientY, canvas, current);
    const panning = tool === "pan" || spacePanRef.current || event.button === 1;

    if (panning) {
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        vx: current.viewport.x,
        vy: current.viewport.y,
      };
      return;
    }

    if (tool === "select" || tool === "eraser") {
      const hit = hitTest(current, world.x, world.y);
      if (tool === "eraser") {
        if (hit && !hit.locked) {
          const next = {
            ...current,
            objects: current.objects.filter((o) => o.id !== hit.id),
          };
          applyLive(next);
          onCommit(next);
        }
        return;
      }
      if (hit) {
        const ids =
          event.shiftKey || event.metaKey || event.ctrlKey
            ? selectedIds.includes(hit.id)
              ? selectedIds.filter((id) => id !== hit.id)
              : [...selectedIds, hit.id]
            : [hit.id];
        onSelect(ids);
        dragRef.current = {
          ids,
          originX: world.x,
          originY: world.y,
          starts: Object.fromEntries(
            current.objects
              .filter((o) => ids.includes(o.id))
              .map((o) => [o.id, { x: o.x, y: o.y }]),
          ),
        };
      } else {
        onSelect([]);
      }
      return;
    }

    if (tool === "image") return;

    const shapeType =
      tool === "pen"
        ? "path"
        : tool === "highlighter"
          ? "highlighter"
          : tool === "free-arrow"
            ? "free-arrow"
            : tool;

    const draft = startShape(world, shapeType as WhiteboardObject["type"]);
    draftRef.current = draft;
    applyLive({ ...current, objects: [...current.objects, draft] });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = docRef.current;

    if (panRef.current) {
      const dx = event.clientX - panRef.current.x;
      const dy = event.clientY - panRef.current.y;
      applyLive({
        ...current,
        viewport: {
          ...current.viewport,
          x: panRef.current.vx + dx,
          y: panRef.current.vy + dy,
        },
      });
      return;
    }

    const world = screenToWorld(event.clientX, event.clientY, canvas, current);

    if (dragRef.current) {
      const dx = world.x - dragRef.current.originX;
      const dy = world.y - dragRef.current.originY;
      const nextObjects = current.objects.map((o) => {
        if (!dragRef.current?.ids.includes(o.id) || o.locked) return o;
        const start = dragRef.current.starts[o.id];
        if (!start) return o;
        return { ...o, x: start.x + dx, y: start.y + dy };
      });
      applyLive({ ...current, objects: nextObjects });
      return;
    }

    const draft = draftRef.current;
    if (!draft) return;

    if (draft.type === "path" || draft.type === "highlighter" || draft.type === "free-arrow") {
      const lx = world.x - draft.x;
      const ly = world.y - draft.y;
      draft.points = [...draft.points, lx, ly];
    } else if (
      draft.type === "rect" ||
      draft.type === "circle" ||
      draft.type === "ellipse" ||
      draft.type === "line" ||
      draft.type === "arrow" ||
      draft.type === "dashed-line"
    ) {
      draft.width = world.x - draft.x;
      draft.height = world.y - draft.y;
    }

    applyLive({
      ...current,
      objects: current.objects.map((o) => (o.id === draft.id ? draft : o)),
    });
  };

  const onPointerUp = () => {
    if (panRef.current) {
      panRef.current = null;
      onCommit(docRef.current);
      return;
    }
    if (dragRef.current) {
      dragRef.current = null;
      onCommit(docRef.current);
      return;
    }
    if (draftRef.current) {
      const draft = draftRef.current;
      draftRef.current = null;
      if (draft.type === "text" || draft.type === "sticky") {
        const nextText = window.prompt(
          draft.type === "sticky" ? "Sticky note text" : "Text",
          draft.text,
        );
        if (nextText !== null) {
          draft.text = nextText;
          applyLive({
            ...docRef.current,
            objects: docRef.current.objects.map((o) =>
              o.id === draft.id ? draft : o,
            ),
          });
        }
      }
      onCommit(docRef.current);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const world = screenToWorld(
        event.clientX,
        event.clientY,
        canvas,
        docRef.current,
      );
      const imageObj: WhiteboardObject = {
        id: createId(),
        type: "image",
        x: world.x,
        y: world.y,
        width: 240,
        height: 180,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: docRef.current.objects.length + 1,
        src,
      };
      const next = {
        ...docRef.current,
        objects: [...docRef.current.objects, imageObj],
      };
      applyLive(next);
      onCommit(next);
      onSelect([imageObj.id]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-[480px] w-full flex-1 overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className={cn(
          "absolute inset-0 h-full w-full touch-none outline-none",
          tool === "pan" || spacePanRef.current
            ? "cursor-grab"
            : tool === "select"
              ? "cursor-default"
              : "cursor-crosshair",
        )}
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Enterprise whiteboard canvas"
        role="img"
      />
    </div>
  );
});
