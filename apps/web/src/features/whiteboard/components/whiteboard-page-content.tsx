"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bot,
  Circle,
  Copy,
  Download,
  Eraser,
  FilePlus2,
  FolderOpen,
  Highlighter,
  ImagePlus,
  Italic,
  Lock,
  MousePointer2,
  Move,
  PenTool,
  Redo2,
  Save,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { WhiteboardAiActionValue, WhiteboardListItem, CreateWhiteboardInput, UpdateWhiteboardInput, WhiteboardAiRequestInput } from "@enterprise/shared";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { WhiteboardCollabClient } from "../collaboration/collab-architecture";
import { useWhiteboardDocument } from "../hooks/use-whiteboard-document";
import {
  useWhiteboardMutations,
  useWhiteboards,
} from "../hooks/use-whiteboards";
import { whiteboardsService } from "../services/whiteboards.service";
import {
  AUTO_SAVE_MS,
  BRUSH_SIZES,
  MAX_ZOOM,
  MIN_ZOOM,
  PRESET_COLORS,
  createEmptyDocument,
  normalizeDocument,
  type BrushSize,
  type WhiteboardTool,
} from "../types/whiteboard.types";
import {
  WhiteboardCanvas,
  type WhiteboardCanvasHandle,
} from "./whiteboard-canvas";
import { WhiteboardCommentsPanel } from "./whiteboard-comments-panel";

const DRAW_TOOLS: Array<{ id: WhiteboardTool; label: string; icon: typeof PenTool }> = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan", icon: Move },
  { id: "pen", label: "Pen", icon: PenTool },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "text", label: "Text", icon: Type },
  { id: "sticky", label: "Sticky", icon: StickyNote },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "ellipse", label: "Ellipse", icon: Italic },
  { id: "line", label: "Line", icon: AlignLeft },
  { id: "arrow", label: "Arrow", icon: ArrowRight },
  { id: "dashed-line", label: "Dashed", icon: AlignCenter },
  { id: "free-arrow", label: "Free Arrow", icon: ArrowRight },
  { id: "image", label: "Image", icon: ImagePlus },
];

const AI_ACTIONS: Array<{ id: WhiteboardAiActionValue; label: string }> = [
  { id: "SUMMARIZE", label: "Summarize" },
  { id: "OCR", label: "OCR" },
  { id: "CONVERT_DIAGRAM", label: "Diagram" },
  { id: "GENERATE_TASKS", label: "Tasks" },
  { id: "MEETING_NOTES", label: "Meeting notes" },
  { id: "SUGGESTIONS", label: "Suggestions" },
];

function formatEdited(iso?: string) {
  if (!iso) return "Not saved yet";
  return new Date(iso).toLocaleString();
}

export function WhiteboardPageContent() {
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clipboardRef = useRef<string[]>([]);
  const { resolvedTheme } = useTheme();
  const board = useWhiteboardDocument();
  const { data: listData, isLoading: listLoading } = useWhiteboards({
    search: "",
    page: 1,
    limit: 50,
  });
  const mutations = useWhiteboardMutations();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Whiteboard");
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [clientId, setClientId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [libraryOpen, setLibraryOpen] = useState(true);

  const items = useMemo(() => {
    const all = listData?.items ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((item) => item.title.toLowerCase().includes(q));
  }, [listData?.items, search]);

  useEffect(() => {
    const nextDefault = resolvedTheme === "light" ? "#0f172a" : "#f8fafc";
    if (board.color === "#0f172a" || board.color === "#f8fafc") {
      board.setColor(nextDefault);
    }
    // Intentionally sync only when theme flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme-driven default ink
  }, [resolvedTheme]);

  useEffect(() => {
    if (!activeId) return;
    const client = new WhiteboardCollabClient(activeId);
    client.connect();
    return () => client.disconnect();
  }, [activeId]);

  const persist = useCallback(
    async (mode: "save" | "saveAs" | "autosave") => {
      const thumbnail = canvasRef.current?.thumbnail() ?? null;
      const canvasData = board.document;
      const attachment = {
        projectId: projectId || null,
        taskId: taskId || null,
        clientId: clientId || null,
        teamId: teamId || null,
      };

      try {
        if (!activeId || mode === "saveAs") {
          const created = await mutations.create.mutateAsync({
            title: mode === "saveAs" ? `${title} (Copy)` : title,
            canvasData: canvasData as CreateWhiteboardInput["canvasData"],
            thumbnail,
            ...attachment,
          });
          setActiveId(created.id);
          setTitle(created.title);
          setUpdatedAt(created.updatedAt);
          board.markClean();
          setStatusMessage(mode === "autosave" ? "Auto-saved" : "Saved");
          return;
        }

        const updated = await mutations.update.mutateAsync({
          id: activeId,
          input: {
            title,
            canvasData: canvasData as UpdateWhiteboardInput["canvasData"],
            thumbnail,
            ...attachment,
            createVersion: mode === "save",
            versionLabel: mode === "save" ? "Manual save" : "Auto save",
          },
        });
        setUpdatedAt(updated.updatedAt);
        board.markClean();
        setStatusMessage(mode === "autosave" ? "Auto-saved" : "Saved");
      } catch {
        setStatusMessage("Save failed");
      }
    },
    [
      activeId,
      board,
      clientId,
      mutations.create,
      mutations.update,
      projectId,
      taskId,
      teamId,
      title,
    ],
  );

  useEffect(() => {
    if (!board.dirty || !activeId) return;
    const timer = window.setTimeout(() => {
      void persist("autosave");
    }, AUTO_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [activeId, board.dirty, board.document, persist]);

  const openBoard = async (item: WhiteboardListItem) => {
    try {
      const detail = await whiteboardsService.getById(item.id);
      setActiveId(detail.id);
      setTitle(detail.title);
      setUpdatedAt(detail.updatedAt);
      setProjectId(detail.projectId ?? "");
      setTaskId(detail.taskId ?? "");
      setClientId(detail.clientId ?? "");
      setTeamId(detail.teamId ?? "");
      board.replaceDocument(normalizeDocument(detail.canvasData));
      setStatusMessage("Opened");
    } catch {
      setStatusMessage("Failed to open");
    }
  };

  const createNew = () => {
    setActiveId(null);
    setTitle("Untitled Whiteboard");
    setUpdatedAt(undefined);
    setProjectId("");
    setTaskId("");
    setClientId("");
    setTeamId("");
    board.replaceDocument(createEmptyDocument());
    setStatusMessage("New board");
  };

  const handleImageUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const image = {
        id: board.createId(),
        type: "image" as const,
        x: 80,
        y: 80,
        width: 260,
        height: 180,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: board.document.objects.length + 1,
        src,
      };
      board.commit({
        ...board.document,
        objects: [...board.document.objects, image],
      });
      board.setSelectedIds([image.id]);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        board.undo();
      }
      if (meta && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
        event.preventDefault();
        board.redo();
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persist("save");
      }
      if (meta && event.key.toLowerCase() === "c") {
        clipboardRef.current = board.selectedIds;
      }
      if (meta && event.key.toLowerCase() === "v" && clipboardRef.current.length) {
        board.setSelectedIds(clipboardRef.current);
        board.duplicateSelected();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        board.deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, persist]);

  const zoomBy = (factor: number) => {
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, board.document.viewport.zoom * factor),
    );
    board.setViewport({ ...board.document.viewport, zoom });
  };

  const ToolButton = ({
    id,
    label,
    icon: Icon,
  }: {
    id: WhiteboardTool;
    label: string;
    icon: typeof PenTool;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={board.tool === id ? "default" : "outline"}
      onClick={() => {
        board.setTool(id);
        if (id === "image") fileInputRef.current?.click();
      }}
      title={label}
      aria-label={label}
      aria-pressed={board.tool === id}
    >
      <Icon aria-hidden="true" />
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col space-y-4">
      <PageHeader
        title="Whiteboard"
        description="Enterprise drawing workspace with cloud save, attachments, export, and AI assist."
      />

      <div className="flex flex-col gap-4 xl:flex-row">
        {libraryOpen ? (
          <Card className="w-full shrink-0 border-border/50 shadow-(--shadow-sm) xl:w-72">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Boards</h2>
                <Button type="button" size="sm" onClick={createNew}>
                  <FilePlus2 aria-hidden="true" />
                  New
                </Button>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search boards"
              />
              <div className="max-h-[420px] space-y-1 overflow-y-auto">
                {listLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No whiteboards yet.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openBoard(item)}
                      className={cn(
                        "w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent",
                        activeId === item.id && "border-border/70 bg-accent",
                      )}
                    >
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatEdited(item.updatedAt)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="min-w-0 flex-1 border-border/50 shadow-(--shadow-sm)">
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  board.setDocument((d) => d);
                }}
                onBlur={() => {
                  if (activeId && title.trim()) {
                    void mutations.rename.mutateAsync({ id: activeId, title });
                  }
                }}
                className="max-w-xs font-medium"
                aria-label="Whiteboard title"
              />
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  board.dirty
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                )}
              >
                {board.dirty ? "Unsaved changes" : "Saved"}
              </span>
              <span className="text-xs text-muted-foreground">
                Last edited: {formatEdited(updatedAt)}
              </span>
              <span className="text-xs text-muted-foreground">{statusMessage}</span>
            </div>

            <div className="enterprise-toolbar !static flex-wrap gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setLibraryOpen((v) => !v)}>
                  <FolderOpen aria-hidden="true" />
                  Library
                </Button>
                <Button type="button" size="sm" onClick={() => void persist("save")}>
                  <Save aria-hidden="true" />
                  Save
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void persist("saveAs")}>
                  Save As
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!activeId}
                  onClick={async () => {
                    if (!activeId) return;
                    const copy = await mutations.duplicate.mutateAsync(activeId);
                    setActiveId(copy.id);
                    setTitle(copy.title);
                    setUpdatedAt(copy.updatedAt);
                  }}
                >
                  <Copy aria-hidden="true" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!activeId}
                  onClick={async () => {
                    if (!activeId) return;
                    if (!window.confirm("Delete this whiteboard?")) return;
                    await mutations.remove.mutateAsync(activeId);
                    createNew();
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </div>

              <Separator orientation="vertical" className="hidden h-8 sm:block" />

              <div className="flex flex-wrap items-center gap-1.5">
                {DRAW_TOOLS.map((t) => (
                  <ToolButton key={t.id} {...t} />
                ))}
              </div>

              <Separator orientation="vertical" className="hidden h-8 sm:block" />

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={board.color}
                  onChange={(e) => board.setColor(e.target.value)}
                  className="size-8 cursor-pointer rounded-lg border border-border/80 bg-card p-1"
                  aria-label="Stroke color"
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-label={`Color ${preset}`}
                      className={cn(
                        "size-5 rounded-md border border-border/70",
                        board.color.toLowerCase() === preset.toLowerCase() &&
                          "ring-2 ring-ring ring-offset-1 ring-offset-background",
                      )}
                      style={{ backgroundColor: preset }}
                      onClick={() => board.setColor(preset)}
                    />
                  ))}
                </div>
                <Label htmlFor="brush" className="text-xs text-muted-foreground">
                  Size
                </Label>
                <select
                  id="brush"
                  value={board.brushSize}
                  onChange={(e) =>
                    board.setBrushSize(Number(e.target.value) as BrushSize)
                  }
                  className="h-8 rounded-lg border border-input bg-background/80 px-2 text-xs"
                >
                  {BRUSH_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={board.undo} disabled={!board.canUndo}>
                  <Undo2 aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={board.redo} disabled={!board.canRedo}>
                  <Redo2 aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={board.clearCanvas}>
                  Clear
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(1.15)}>
                  <ZoomIn aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(1 / 1.15)}>
                  <ZoomOut aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => board.setViewport({ x: 0, y: 0, zoom: 1 })}
                >
                  Reset Zoom
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={board.duplicateSelected}>
                  Dup Obj
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={board.toggleLockSelected}>
                  <Lock aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => board.alignSelected("left")}>
                  <AlignLeft aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => board.alignSelected("center")}>
                  <AlignCenter aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => board.alignSelected("right")}>
                  <AlignRight aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => board.layerSelected("forward")}>
                  Forward
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => board.layerSelected("backward")}>
                  Back
                </Button>
                <Button type="button" size="sm" onClick={() => void canvasRef.current?.export("PNG")}>
                  <Download aria-hidden="true" />
                  PNG
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void canvasRef.current?.export("JPG")}>
                  JPG
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void canvasRef.current?.export("PDF")}>
                  PDF
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void canvasRef.current?.export("SVG")}>
                  SVG
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="projectId">Project ID</Label>
                <Input id="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project UUID — shared with members" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taskId">Task ID</Label>
                <Input id="taskId" value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="Task UUID (optional)" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientId">Client ID</Label>
                <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client UUID — portal company link" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="teamId">Team ID</Label>
                <Input id="teamId" value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Team UUID — shared with members" />
              </div>
            </div>

            <WhiteboardCanvas
              ref={canvasRef}
              document={board.document}
              tool={board.tool}
              color={board.color}
              brushSize={board.brushSize}
              selectedIds={board.selectedIds}
              onDocumentLive={(doc) => board.setDocument(doc)}
              onCommit={(doc) => board.commit(doc)}
              onSelect={board.setSelectedIds}
              className="min-h-[560px]"
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Bot className="size-4" aria-hidden="true" />
                  AI Assistant
                </div>
                <div className="flex flex-wrap gap-2">
                  {AI_ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!activeId || mutations.runAi.isPending}
                      onClick={async () => {
                        if (!activeId) {
                          setAiResult("Save the whiteboard first to run AI actions.");
                          return;
                        }
                        try {
                          const result = await mutations.runAi.mutateAsync({
                            id: activeId,
                            input: {
                              action: action.id,
                              canvasData: board.document as WhiteboardAiRequestInput["canvasData"],
                            },
                          });
                          setAiResult(result.result);
                        } catch {
                          setAiResult("AI request failed.");
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                {aiResult ? (
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                    {aiResult}
                  </pre>
                ) : null}
              </div>

              <WhiteboardCommentsPanel whiteboardId={activeId} />
            </div>
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleImageUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
