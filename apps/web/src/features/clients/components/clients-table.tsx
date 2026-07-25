"use client";

import type { Client, ListClientsQueryInput } from "@enterprise/shared";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { ResponsiveDataView } from "@/components/common/data/responsive-data-view";
import { VirtualizedList } from "@/components/common/data/virtualized-list";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ClientStatusBadge } from "./client-status-badge";

type SortField = ListClientsQueryInput["sortBy"];

interface ClientsTableProps {
  clients: Client[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canWrite: boolean;
  canDelete: boolean;
}

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />;
  }

  return order === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
  );
}

function ClientRowActions({
  client,
  onView,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="touch-target-auto"
          aria-label={`Actions for ${client.companyName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onView(client)}>
          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          View details
        </DropdownMenuItem>
        {canWrite ? (
          <DropdownMenuItem onSelect={() => onEdit(client)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(client)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClientsTable({
  clients,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
}: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients found"
        description="Try adjusting search or filters, or create a new client."
        className="border-0 bg-transparent"
      />
    );
  }

  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: "companyName", label: "Company" },
    { field: "contactName", label: "Contact", className: "hidden lg:table-cell" },
    { field: "email", label: "Email", className: "hidden xl:table-cell" },
    { field: "status", label: "Status" },
    { field: "createdAt", label: "Created", className: "hidden 2xl:table-cell" },
  ];

  const actionProps = { onView, onEdit, onDelete, canWrite, canDelete };

  const table = (
    <div className="overflow-x-auto enterprise-table-shell">
      <table className="table-sticky-header w-full min-w-[640px] text-sm md:min-w-0">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column) => (
              <th
                key={column.field}
                scope="col"
                className={cn(
                  "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4",
                  column.className,
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onSort(column.field)}
                  aria-label={`Sort by ${column.label}`}
                >
                  {column.label}
                  <SortIcon
                    active={sortBy === column.field}
                    order={sortOrder}
                  />
                </button>
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
            >
              <td className="px-3 py-3 lg:px-4">
                <div>
                  <p className="font-medium text-foreground">
                    {client.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground lg:hidden">
                    {client.contactName}
                  </p>
                </div>
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell lg:px-4">
                {client.contactName}
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell xl:px-4">
                {client.email}
              </td>
              <td className="px-3 py-3 lg:px-4">
                <ClientStatusBadge status={client.status} />
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground 2xl:table-cell 2xl:px-4">
                {new Date(client.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-3 text-right lg:px-4">
                <ClientRowActions client={client} {...actionProps} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <VirtualizedList
      items={clients}
      estimateSize={128}
      heightClassName="max-h-[min(70vh,720px)]"
      getItemKey={(client) => client.id}
      renderItem={(client) => (
        <div className="pb-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => onView(client)}
              >
                <p className="font-medium text-foreground">
                  {client.companyName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {client.contactName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {client.email}
                </p>
              </button>
              <ClientRowActions client={client} {...actionProps} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ClientStatusBadge status={client.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(client.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    />
  );

  return <ResponsiveDataView table={table} cards={cards} />;
}
