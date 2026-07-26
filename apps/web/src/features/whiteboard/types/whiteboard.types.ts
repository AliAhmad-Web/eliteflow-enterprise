export type WhiteboardTool =
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "eraser"
  | "text"
  | "sticky"
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "arrow"
  | "dashed-line"
  | "free-arrow"
  | "image";

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type LayerAction = "forward" | "backward" | "front" | "back";

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardObjectBase {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  zIndex: number;
}

export interface PathObject extends WhiteboardObjectBase {
  type: "path" | "highlighter" | "free-arrow";
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export interface ShapeObject extends WhiteboardObjectBase {
  type: "rect" | "circle" | "ellipse" | "line" | "arrow" | "dashed-line";
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

export interface TextObject extends WhiteboardObjectBase {
  type: "text" | "sticky";
  width: number;
  height: number;
  text: string;
  fill: string;
  stroke: string;
  fontSize: number;
  color: string;
}

export interface ImageObject extends WhiteboardObjectBase {
  type: "image";
  width: number;
  height: number;
  src: string;
}

export type WhiteboardObject =
  | PathObject
  | ShapeObject
  | TextObject
  | ImageObject;

export interface WhiteboardDocument {
  schemaVersion: 1;
  viewport: ViewportState;
  objects: WhiteboardObject[];
}

export const BRUSH_SIZES = [2, 4, 8, 12, 20, 32] as const;
export type BrushSize = (typeof BRUSH_SIZES)[number];

export const PRESET_COLORS = [
  "#0f172a",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
] as const;

export const MAX_HISTORY = 50;
export const AUTO_SAVE_MS = 15_000;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export function createEmptyDocument(): WhiteboardDocument {
  return {
    schemaVersion: 1,
    viewport: { x: 0, y: 0, zoom: 1 },
    objects: [],
  };
}

export function createId(prefix = "obj"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function cloneDocument(doc: WhiteboardDocument): WhiteboardDocument {
  return structuredClone(doc);
}

export function normalizeDocument(raw: unknown): WhiteboardDocument {
  if (!raw || typeof raw !== "object") {
    return createEmptyDocument();
  }
  const data = raw as Partial<WhiteboardDocument>;
  return {
    schemaVersion: 1,
    viewport: {
      x: data.viewport?.x ?? 0,
      y: data.viewport?.y ?? 0,
      zoom: data.viewport?.zoom ?? 1,
    },
    objects: Array.isArray(data.objects)
      ? (data.objects as WhiteboardObject[])
      : [],
  };
}
