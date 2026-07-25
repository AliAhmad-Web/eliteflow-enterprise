"use client";

import { useQuery } from "@tanstack/react-query";
import { Link2, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { aiService } from "@/features/ai/services/ai.service";
import { calendarService } from "@/features/calendar/services/calendar.service";
import { clientsService } from "@/features/clients/services/clients.service";
import { filesService } from "@/features/files/services/files.service";
import { invoicesService } from "@/features/invoices/services/invoices.service";
import { projectsService } from "@/features/projects/services/projects.service";
import { tasksService } from "@/features/tasks/services/tasks.service";

import {
  LINKED_ENTITY_TYPES,
  linkedEntityLabel,
  type LinkedEntityType,
  type LinkedRecordRef,
} from "../utils/message-linked-records";

interface LinkRecordPickerProps {
  selected: LinkedRecordRef[];
  onChange: (next: LinkedRecordRef[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkRecordPicker({
  selected,
  onChange,
  open,
  onOpenChange,
}: LinkRecordPickerProps) {
  const [type, setType] = useState<LinkedEntityType>("PROJECT");
  const [search, setSearch] = useState("");

  const options = useLinkRecordOptions(type, search, open);

  function toggle(ref: LinkedRecordRef) {
    const exists = selected.some(
      (item) => item.type === ref.type && item.id === ref.id,
    );
    if (exists) {
      onChange(
        selected.filter(
          (item) => !(item.type === ref.type && item.id === ref.id),
        ),
      );
      return;
    }
    onChange([...selected, ref]);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        onClick={() => onOpenChange(true)}
      >
        <Link2 className="h-3.5 w-3.5" />
        Link record
        {selected.length > 0 ? (
          <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
            {selected.length}
          </span>
        ) : null}
      </Button>
    );
  }

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-md">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold">Link ERP record</p>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
        {LINKED_ENTITY_TYPES.map((entityType) => (
          <button
            key={entityType}
            type="button"
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
              type === entityType
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            onClick={() => setType(entityType)}
          >
            {linkedEntityLabel(entityType)}
          </button>
        ))}
      </div>

      <div className="relative px-2 py-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${linkedEntityLabel(type).toLowerCase()}s…`}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="max-h-48 overflow-y-auto px-1 pb-2">
        {options.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : options.items.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No matching records
          </p>
        ) : (
          options.items.map((item) => {
            const active = selected.some(
              (ref) => ref.type === type && ref.id === item.id,
            );
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition",
                  active ? "bg-primary/10" : "hover:bg-accent",
                )}
                onClick={() => toggle({ type, id: item.id })}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {item.subtitle}
                  </span>
                </span>
                <span
                  className={cn(
                    "ml-2 shrink-0 text-[10px] font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {active ? "Linked" : "Link"}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-t border-border px-2 py-2">
          {selected.map((ref) => (
            <button
              key={`${ref.type}:${ref.id}`}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
              onClick={() =>
                onChange(
                  selected.filter(
                    (item) =>
                      !(item.type === ref.type && item.id === ref.id),
                  ),
                )
              }
            >
              {linkedEntityLabel(ref.type)}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function useLinkRecordOptions(
  type: LinkedEntityType,
  search: string,
  enabled: boolean,
): {
  items: Array<{ id: string; title: string; subtitle: string }>;
  isLoading: boolean;
} {
  const q = search.trim();

  const projects = useQuery({
    queryKey: ["communication", "link-picker", "projects", q],
    queryFn: () =>
      projectsService.list({
        page: 1,
        limit: 8,
        search: q,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    enabled: enabled && type === "PROJECT",
  });
  const tasks = useQuery({
    queryKey: ["communication", "link-picker", "tasks", q],
    queryFn: () =>
      tasksService.list({
        page: 1,
        limit: 8,
        search: q,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    enabled: enabled && type === "TASK",
  });
  const invoices = useQuery({
    queryKey: ["communication", "link-picker", "invoices", q],
    queryFn: () =>
      invoicesService.list({
        page: 1,
        limit: 8,
        search: q,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    enabled: enabled && type === "INVOICE",
  });
  const clients = useQuery({
    queryKey: ["communication", "link-picker", "clients", q],
    queryFn: () =>
      clientsService.list({
        page: 1,
        limit: 8,
        search: q,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    enabled: enabled && type === "CLIENT",
  });
  const events = useQuery({
    queryKey: ["communication", "link-picker", "calendar", q],
    queryFn: () =>
      calendarService.listEvents({
        page: 1,
        limit: 8,
        search: q,
        view: "agenda",
      }),
    enabled: enabled && type === "CALENDAR",
  });
  const files = useQuery({
    queryKey: ["communication", "link-picker", "files", q],
    queryFn: () =>
      filesService.listFiles({
        page: 1,
        limit: 8,
        search: q,
        sortBy: "updatedAt",
        sortOrder: "desc",
        view: "all",
      }),
    enabled: enabled && type === "FILE",
  });
  const documents = useQuery({
    queryKey: ["communication", "link-picker", "ai-documents", q],
    queryFn: () =>
      aiService.listDocuments({
        page: 1,
        limit: 8,
        search: q,
      }),
    enabled: enabled && type === "AI_DOCUMENT",
  });

  return useMemo(() => {
    switch (type) {
      case "PROJECT":
        return {
          isLoading: projects.isLoading,
          items: (projects.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.status,
          })),
        };
      case "TASK":
        return {
          isLoading: tasks.isLoading,
          items: (tasks.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.status,
          })),
        };
      case "INVOICE":
        return {
          isLoading: invoices.isLoading,
          items: (invoices.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.invoiceNumber,
            subtitle: item.status,
          })),
        };
      case "CLIENT":
        return {
          isLoading: clients.isLoading,
          items: (clients.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.companyName,
            subtitle: item.status,
          })),
        };
      case "CALENDAR":
        return {
          isLoading: events.isLoading,
          items: (events.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.status,
          })),
        };
      case "FILE":
        return {
          isLoading: files.isLoading,
          items: (files.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.category ?? item.mimeType ?? "File",
          })),
        };
      case "AI_DOCUMENT":
        return {
          isLoading: documents.isLoading,
          items: (documents.data?.items ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.type,
          })),
        };
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }, [
    type,
    projects.isLoading,
    projects.data,
    tasks.isLoading,
    tasks.data,
    invoices.isLoading,
    invoices.data,
    clients.isLoading,
    clients.data,
    events.isLoading,
    events.data,
    files.isLoading,
    files.data,
    documents.isLoading,
    documents.data,
  ]);
}
