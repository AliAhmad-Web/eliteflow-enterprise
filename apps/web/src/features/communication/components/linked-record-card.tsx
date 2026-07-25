"use client";

import Link from "next/link";
import {
  Bot,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  ListTodo,
  Receipt,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAiDocument } from "@/features/ai/hooks/use-ai";
import { useCalendarEvent } from "@/features/calendar/hooks/use-calendar";
import { useClient } from "@/features/clients/hooks/use-clients";
import { useFileDetail } from "@/features/files/hooks/use-files";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useTask } from "@/features/tasks/hooks/use-tasks";

import {
  buildLinkedRecordDeepLink,
  formatLinkedStatus,
  linkedEntityLabel,
  linkedEntityOpenLabel,
  type LinkedEntityType,
  type LinkedRecordRef,
} from "../utils/message-linked-records";

interface LinkedRecordCardProps {
  record: LinkedRecordRef;
  messageId?: string;
  isOwn?: boolean;
  className?: string;
}

export function LinkedRecordCard({
  record,
  messageId,
  isOwn = false,
  className,
}: LinkedRecordCardProps) {
  const details = useLinkedRecordDetails(record);
  const href = buildLinkedRecordDeepLink(record.type, record.id, { messageId });

  return (
    <Link
      href={href}
      className={cn(
        "mt-2 block w-full min-w-[220px] max-w-sm overflow-hidden rounded-xl border text-left transition-colors",
        isOwn
          ? "border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "border-border bg-background/90 hover:bg-accent/50",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isOwn ? "bg-primary-foreground/15" : "bg-muted",
          )}
        >
          <EntityIcon type={record.type} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {linkedEntityLabel(record.type)}
          </p>
          <p
            className={cn(
              "truncate text-sm font-semibold leading-5",
              isOwn ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {details.isLoading ? "Loading…" : details.title}
          </p>
          <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
            <span
              className={cn(
                isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
              )}
            >
              Status
            </span>
            <span
              className={cn(
                "truncate font-medium",
                isOwn ? "text-primary-foreground/90" : "text-foreground",
              )}
            >
              {details.isLoading ? "…" : details.status}
            </span>
          </div>
          <p
            className={cn(
              "mt-2 text-[11px] font-semibold underline-offset-2 hover:underline",
              isOwn ? "text-sky-100" : "text-primary",
            )}
          >
            {linkedEntityOpenLabel(record.type)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function LinkedRecordCards({
  records,
  messageId,
  isOwn,
}: {
  records: LinkedRecordRef[];
  messageId?: string;
  isOwn?: boolean;
}) {
  if (records.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {records.map((record) => (
        <LinkedRecordCard
          key={`${record.type}:${record.id}`}
          record={record}
          messageId={messageId}
          isOwn={isOwn}
        />
      ))}
    </div>
  );
}

function useLinkedRecordDetails(record: LinkedRecordRef): {
  title: string;
  status: string;
  isLoading: boolean;
} {
  const project = useProject(record.type === "PROJECT" ? record.id : null);
  const task = useTask(record.type === "TASK" ? record.id : null);
  const invoice = useInvoice(record.type === "INVOICE" ? record.id : null);
  const client = useClient(record.type === "CLIENT" ? record.id : null);
  const event = useCalendarEvent(record.type === "CALENDAR" ? record.id : null);
  const file = useFileDetail(record.type === "FILE" ? record.id : null);
  const document = useAiDocument(
    record.type === "AI_DOCUMENT" ? record.id : null,
  );

  switch (record.type) {
    case "PROJECT":
      return {
        title: project.data?.name ?? "Project",
        status: formatLinkedStatus(project.data?.status),
        isLoading: project.isLoading,
      };
    case "TASK":
      return {
        title: task.data?.title ?? "Task",
        status: formatLinkedStatus(task.data?.status),
        isLoading: task.isLoading,
      };
    case "INVOICE":
      return {
        title: invoice.data?.invoiceNumber ?? "Invoice",
        status: formatLinkedStatus(invoice.data?.status),
        isLoading: invoice.isLoading,
      };
    case "CLIENT":
      return {
        title: client.data?.companyName ?? "Client",
        status: formatLinkedStatus(client.data?.status),
        isLoading: client.isLoading,
      };
    case "CALENDAR":
      return {
        title: event.data?.title ?? "Event",
        status: formatLinkedStatus(event.data?.status),
        isLoading: event.isLoading,
      };
    case "FILE":
      return {
        title: file.data?.name ?? "File",
        status: formatLinkedStatus(
          file.data?.category ?? (file.data?.mimeType ? "Available" : null),
        ),
        isLoading: file.isLoading,
      };
    case "AI_DOCUMENT":
      return {
        title: document.data?.title ?? "AI Document",
        status: formatLinkedStatus(document.data?.type ?? "Document"),
        isLoading: document.isLoading,
      };
    default: {
      const _exhaustive: never = record.type;
      return _exhaustive;
    }
  }
}

function EntityIcon({
  type,
  className,
}: {
  type: LinkedEntityType;
  className?: string;
}) {
  switch (type) {
    case "PROJECT":
      return <FolderKanban className={className} />;
    case "TASK":
      return <ListTodo className={className} />;
    case "INVOICE":
      return <Receipt className={className} />;
    case "CLIENT":
      return <Building2 className={className} />;
    case "CALENDAR":
      return <CalendarDays className={className} />;
    case "FILE":
      return <FileText className={className} />;
    case "AI_DOCUMENT":
      return <Bot className={className} />;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
