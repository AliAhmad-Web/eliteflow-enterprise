"use client";

import {
  INVOICE_STATUSES,
  TASK_STATUSES,
} from "@enterprise/shared";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useTeams } from "@/features/team/hooks/use-team";

import { REPORTS_SELECT_CLASS_NAME } from "./reports-form-styles";

export interface ReportsAdvancedFilterValues {
  clientId: string;
  projectId: string;
  teamId: string;
  invoiceStatus: string;
  taskStatus: string;
}

export interface ReportsFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApply: () => void;
  advancedFilters?: boolean;
  advancedValues?: ReportsAdvancedFilterValues;
  onAdvancedChange?: (values: ReportsAdvancedFilterValues) => void;
  onClearAdvanced?: () => void;
}

const EMPTY_ADVANCED: ReportsAdvancedFilterValues = {
  clientId: "",
  projectId: "",
  teamId: "",
  invoiceStatus: "",
  taskStatus: "",
};

export function ReportsFilters({
  open,
  onOpenChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApply,
  advancedFilters = false,
  advancedValues = EMPTY_ADVANCED,
  onAdvancedChange,
  onClearAdvanced,
}: ReportsFiltersProps) {
  const loadOptions = advancedFilters && open;

  const clientsListQuery = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: "",
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [],
  );
  const projectsListQuery = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: "",
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [],
  );

  const clientsQuery = useClients(clientsListQuery);
  const projectsQuery = useProjects(projectsListQuery);
  const teamsQuery = useTeams();

  const clients = loadOptions ? (clientsQuery.data?.items ?? []) : [];
  const projects = loadOptions ? (projectsQuery.data?.items ?? []) : [];
  const teams = loadOptions ? (teamsQuery.data?.items ?? []) : [];

  const patchAdvanced = (patch: Partial<ReportsAdvancedFilterValues>) => {
    onAdvancedChange?.({ ...advancedValues, ...patch });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Report filters</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {advancedFilters
              ? "Narrow analytics by date range and dimensions."
              : "Narrow analytics by custom date range."}
          </p>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-from">From</Label>
            <Input
              id="custom-from"
              type="datetime-local"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-to">To</Label>
            <Input
              id="custom-to"
              type="datetime-local"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
            />
          </div>

          {advancedFilters ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="filter-client">Client</Label>
                <select
                  id="filter-client"
                  className={REPORTS_SELECT_CLASS_NAME}
                  value={advancedValues.clientId}
                  onChange={(event) =>
                    patchAdvanced({ clientId: event.target.value })
                  }
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-project">Project</Label>
                <select
                  id="filter-project"
                  className={REPORTS_SELECT_CLASS_NAME}
                  value={advancedValues.projectId}
                  onChange={(event) =>
                    patchAdvanced({ projectId: event.target.value })
                  }
                >
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-team">Team</Label>
                <select
                  id="filter-team"
                  className={REPORTS_SELECT_CLASS_NAME}
                  value={advancedValues.teamId}
                  onChange={(event) =>
                    patchAdvanced({ teamId: event.target.value })
                  }
                >
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-invoice-status">Invoice status</Label>
                <select
                  id="filter-invoice-status"
                  className={REPORTS_SELECT_CLASS_NAME}
                  value={advancedValues.invoiceStatus}
                  onChange={(event) =>
                    patchAdvanced({ invoiceStatus: event.target.value })
                  }
                >
                  <option value="">All invoice statuses</option>
                  {INVOICE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-task-status">Task status</Label>
                <select
                  id="filter-task-status"
                  className={REPORTS_SELECT_CLASS_NAME}
                  value={advancedValues.taskStatus}
                  onChange={(event) =>
                    patchAdvanced({ taskStatus: event.target.value })
                  }
                >
                  <option value="">All task statuses</option>
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              {onClearAdvanced ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onClearAdvanced}
                >
                  Clear dimension filters
                </Button>
              ) : null}
            </>
          ) : null}

          <Button className="w-full" onClick={onApply}>
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
