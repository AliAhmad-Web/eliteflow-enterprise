import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  InvoiceStatus,
  ProjectStatus,
} from "@/features/dashboard/types/dashboard.types";

const projectStatusConfig: Record<
  ProjectStatus,
  { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" }
> = {
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  on_hold: { label: "On Hold", variant: "warning" },
  not_started: { label: "Not Started", variant: "secondary" },
};

const invoiceStatusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = projectStatusConfig[status];
  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = invoiceStatusConfig[status];
  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}
