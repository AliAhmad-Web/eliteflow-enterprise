"use client";

import {
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_EVENT_STATUSES,
  CALENDAR_EVENT_TYPES,
  RECURRENCE_FREQUENCIES,
  type CalendarEvent,
  type CreateCalendarEventInput,
  type ReminderChannelValue,
} from "@enterprise/shared";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  EVENT_CATEGORY_LABELS,
  EVENT_COLORS,
  EVENT_TYPE_LABELS,
  fromLocalInputValue,
  toLocalInputValue,
} from "../types/calendar.types";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

export type EventFormValues = CreateCalendarEventInput;

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CalendarEvent | null;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  saving?: boolean;
  readOnly?: boolean;
}

function emptyForm(startsAt?: string, endsAt?: string): EventFormValues {
  const start = startsAt ?? new Date().toISOString();
  const end =
    endsAt ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
  return {
    title: "",
    description: "",
    notes: "",
    location: "",
    type: "EVENT",
    status: "SCHEDULED",
    category: "WORK",
    color: "#2563eb",
    startsAt: start,
    endsAt: end,
    allDay: false,
    isPrivate: false,
    recurrenceFrequency: "NONE",
    recurrenceInterval: 1,
    recurrenceUntil: null,
    recurrenceCount: null,
    attachmentUrls: [],
    projectId: null,
    taskId: null,
    clientId: null,
    attendeeUserIds: [],
    attendees: [],
    reminders: [{ channel: "IN_APP", minutesBefore: 15 }],
  };
}

function fromEvent(event: CalendarEvent): EventFormValues {
  return {
    title: event.title,
    description: event.description ?? "",
    notes: event.notes ?? "",
    location: event.location ?? "",
    type: event.type,
    status: event.status,
    category: event.category,
    color: event.color,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    isPrivate: event.isPrivate,
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceUntil: event.recurrenceUntil,
    recurrenceCount: event.recurrenceCount,
    attachmentUrls: event.attachmentUrls,
    projectId: event.projectId,
    taskId: event.taskId,
    clientId: event.clientId,
    attendeeUserIds: event.attendees?.map((a) => a.userId) ?? [],
    attendees: [],
    reminders:
      event.reminders?.map((r) => ({
        channel: r.channel,
        minutesBefore: r.minutesBefore,
      })) ?? [],
  };
}

export function EventModal({
  open,
  onOpenChange,
  initial,
  defaultStartsAt,
  defaultEndsAt,
  onSubmit,
  saving,
  readOnly,
}: EventModalProps) {
  const [form, setForm] = useState<EventFormValues>(
    emptyForm(defaultStartsAt, defaultEndsAt),
  );
  const [attachmentInput, setAttachmentInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      initial
        ? fromEvent(initial)
        : emptyForm(defaultStartsAt, defaultEndsAt),
    );
  }, [open, initial, defaultStartsAt, defaultEndsAt]);

  const update = <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    try {
      setError(null);
      await onSubmit({
        ...form,
        title: form.title.trim(),
        description: form.description || null,
        notes: form.notes || null,
        location: form.location || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Event details" : initial ? "Edit event" : "Create event"}
          </DialogTitle>
          <DialogDescription>
            Schedule meetings, deadlines, reminders, and shared team events.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={form.title}
              disabled={readOnly}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <select
                className={selectClassName}
                value={form.type}
                disabled={readOnly}
                onChange={(e) =>
                  update("type", e.target.value as EventFormValues["type"])
                }
              >
                {CALENDAR_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <select
                className={selectClassName}
                value={form.category}
                disabled={readOnly}
                onChange={(e) =>
                  update(
                    "category",
                    e.target.value as EventFormValues["category"],
                  )
                }
              >
                {CALENDAR_EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {EVENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                className={selectClassName}
                value={form.status}
                disabled={readOnly}
                onChange={(e) =>
                  update("status", e.target.value as EventFormValues["status"])
                }
              >
                {CALENDAR_EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={readOnly}
                    aria-label={`Color ${color}`}
                    className="h-7 w-7 rounded-full border-2 border-transparent"
                    style={{
                      backgroundColor: color,
                      outline:
                        form.color === color ? `2px solid ${color}` : undefined,
                      outlineOffset: 2,
                    }}
                    onClick={() => update("color", color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="starts-at">Starts</Label>
              <Input
                id="starts-at"
                type="datetime-local"
                disabled={readOnly}
                value={toLocalInputValue(form.startsAt)}
                onChange={(e) =>
                  update("startsAt", fromLocalInputValue(e.target.value))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ends-at">Ends</Label>
              <Input
                id="ends-at"
                type="datetime-local"
                disabled={readOnly}
                value={toLocalInputValue(form.endsAt)}
                onChange={(e) =>
                  update("endsAt", fromLocalInputValue(e.target.value))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allDay}
                disabled={readOnly}
                onChange={(e) => update("allDay", e.target.checked)}
              />
              All day
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPrivate}
                disabled={readOnly}
                onChange={(e) => update("isPrivate", e.target.checked)}
              />
              Private
            </label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location ?? ""}
              disabled={readOnly}
              onChange={(e) => update("location", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description ?? ""}
              disabled={readOnly}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.notes ?? ""}
              disabled={readOnly}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Recurrence</Label>
              <select
                className={selectClassName}
                value={form.recurrenceFrequency}
                disabled={readOnly}
                onChange={(e) =>
                  update(
                    "recurrenceFrequency",
                    e.target.value as EventFormValues["recurrenceFrequency"],
                  )
                }
              >
                {RECURRENCE_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Interval</Label>
              <Input
                type="number"
                min={1}
                disabled={readOnly || form.recurrenceFrequency === "NONE"}
                value={form.recurrenceInterval}
                onChange={(e) =>
                  update("recurrenceInterval", Number(e.target.value) || 1)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                disabled={readOnly || form.recurrenceFrequency === "NONE"}
                value={form.recurrenceCount ?? ""}
                onChange={(e) =>
                  update(
                    "recurrenceCount",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Reminders (minutes before)</Label>
            <div className="flex flex-wrap gap-2">
              {(form.reminders ?? []).map((reminder, index) => (
                <div
                  key={`${reminder.channel}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1"
                >
                  <select
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                    disabled={readOnly}
                    value={reminder.channel}
                    onChange={(e) => {
                      const next = [...(form.reminders ?? [])];
                      next[index] = {
                        ...reminder,
                        channel: e.target.value as ReminderChannelValue,
                      };
                      update("reminders", next);
                    }}
                  >
                    <option value="IN_APP">In-app</option>
                    <option value="EMAIL">Email</option>
                  </select>
                  <Input
                    type="number"
                    className="h-8 w-20"
                    disabled={readOnly}
                    value={reminder.minutesBefore}
                    onChange={(e) => {
                      const next = [...(form.reminders ?? [])];
                      next[index] = {
                        ...reminder,
                        minutesBefore: Number(e.target.value) || 0,
                      };
                      update("reminders", next);
                    }}
                  />
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update(
                          "reminders",
                          (form.reminders ?? []).filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("reminders", [
                      ...(form.reminders ?? []),
                      { channel: "IN_APP", minutesBefore: 30 },
                    ])
                  }
                >
                  Add reminder
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Attachments (URLs)</Label>
            <div className="flex gap-2">
              <Input
                value={attachmentInput}
                disabled={readOnly}
                placeholder="https://..."
                onChange={(e) => setAttachmentInput(e.target.value)}
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!attachmentInput.trim()) return;
                    update("attachmentUrls", [
                      ...(form.attachmentUrls ?? []),
                      attachmentInput.trim(),
                    ]);
                    setAttachmentInput("");
                  }}
                >
                  Add
                </Button>
              )}
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {(form.attachmentUrls ?? []).map((url) => (
                <li key={url} className="flex items-center justify-between gap-2">
                  <a href={url} className="truncate underline" target="_blank" rel="noreferrer">
                    {url}
                  </a>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update(
                          "attachmentUrls",
                          (form.attachmentUrls ?? []).filter((item) => item !== url),
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly && (
            <Button onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? "Saving..." : initial ? "Save changes" : "Create event"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
