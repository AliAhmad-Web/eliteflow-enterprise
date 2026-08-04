"use client";

import {
  DOCUMENT_TYPES,
  EMPLOYEE_STATUSES,
  type Attendance,
  type Department,
  type DocumentTypeValue,
  type EmployeeDocumentDto,
  type EmployeeGoal,
  type EmployeeProfile,
  type EmployeePromotionDto,
  type EmployeeStatusValue,
  type EmployeeTimelineEventDto,
  type EmployeeTransferDto,
  type LeaveRequest,
  type ListEmployeesQueryInput,
  type PerformanceReview,
  type Team,
} from "@enterprise/shared";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CreditCard,
  Download,
  ExternalLink,
  LayoutGrid,
  List,
  Search,
  Shield,
  KeyRound,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  ATTENDANCE_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  EMPLOYEE_GENDER_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GOAL_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  LIFECYCLE_STAGE_LABELS,
  MARITAL_STATUS_LABELS,
  PERFORMANCE_RATING_LABELS,
  WORK_SHIFT_LABELS,
  formatCreatedBy,
  formatDate,
  formatDateTime,
  formatEmployeeName,
  formatMinutes,
} from "../types/team.types";
import { teamService } from "../services/team.service";
import {
  DirectorySkeleton,
  EmployeeAvatar,
  employeeStatusTone,
  selectClassName,
  StatusPill,
  toolbarSelectClassName,
} from "./team-shared";

type EmployeeSortField = Extract<
  ListEmployeesQueryInput["sortBy"],
  "employeeCode" | "status" | "designation"
>;

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

function isImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith("image/"));
}

function isPdfMime(mime: string | null | undefined): boolean {
  return mime === "application/pdf";
}

function inferMimeFromUrl(url: string): string | null {
  const lower = url.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

function DirectorySortButton({
  label,
  field,
  sortBy,
  sortDir,
  onSortChange,
}: {
  label: string;
  field: EmployeeSortField;
  sortBy?: ListEmployeesQueryInput["sortBy"];
  sortDir?: ListEmployeesQueryInput["sortDir"];
  onSortChange?: (
    sortBy: ListEmployeesQueryInput["sortBy"],
    sortDir: ListEmployeesQueryInput["sortDir"],
  ) => void;
}) {
  const active = sortBy === field;
  const ariaSort = active
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      aria-label={`Sort by ${label}${active ? `, currently ${ariaSort}` : ""}`}
      onClick={() => {
        if (!onSortChange) return;
        if (active) {
          onSortChange(field, sortDir === "asc" ? "desc" : "asc");
        } else {
          onSortChange(field, "asc");
        }
      }}
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
}

export function DirectoryPanel({
  employees,
  departments,
  teams,
  isLoading,
  isError,
  error,
  onRetry,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  teamFilter,
  onTeamFilterChange,
  roleFilter,
  onRoleFilterChange,
  managerFilter,
  onManagerFilterChange,
  managers = [],
  viewMode,
  onViewModeChange,
  sortBy,
  sortDir,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  canManage,
  canManageOrg,
  onViewProfile,
  onEditEmployee,
  onDeleteEmployee,
  onAddDepartment,
  onExportCsv,
  exportCsvPending,
}: {
  employees: EmployeeProfile[];
  departments: Department[];
  teams: Team[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: EmployeeStatusValue | "ALL";
  onStatusFilterChange: (value: EmployeeStatusValue | "ALL") => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  roleFilter: "ALL" | "ADMIN" | "EMPLOYEE";
  onRoleFilterChange: (value: "ALL" | "ADMIN" | "EMPLOYEE") => void;
  managerFilter: string;
  onManagerFilterChange: (value: string) => void;
  managers?: EmployeeProfile[];
  viewMode: "list" | "cards";
  onViewModeChange: (mode: "list" | "cards") => void;
  sortBy?: ListEmployeesQueryInput["sortBy"];
  sortDir?: ListEmployeesQueryInput["sortDir"];
  onSortChange?: (
    sortBy: ListEmployeesQueryInput["sortBy"],
    sortDir: ListEmployeesQueryInput["sortDir"],
  ) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canManage: boolean;
  canManageOrg: boolean;
  onViewProfile: (id: string) => void;
  onEditEmployee: (employee: EmployeeProfile) => void;
  onDeleteEmployee: (id: string) => void;
  onAddDepartment: () => void;
  onExportCsv?: () => void;
  exportCsvPending?: boolean;
  departmentsLoading?: boolean;
}) {
  const managerOptions = (managers.length > 0 ? managers : employees)
    .filter((employee) => employee.user)
    .map((employee) => ({
      id: employee.userId,
      label: `${employee.user!.firstName} ${employee.user!.lastName}`.trim(),
    }))
    .filter(
      (option, index, all) =>
        all.findIndex((item) => item.id === option.id) === index,
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 max-w-md flex-1 basis-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name, ID, email…"
                aria-label="Search employees"
                className="pl-9"
              />
            </div>
            {canManage ? (
              <>
                <select
                  className={toolbarSelectClassName}
                  value={statusFilter}
                  onChange={(e) =>
                    onStatusFilterChange(
                      e.target.value as EmployeeStatusValue | "ALL",
                    )
                  }
                  aria-label="Filter by status"
                >
                  <option value="ALL">All statuses</option>
                  {EMPLOYEE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {EMPLOYEE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <select
                  className={toolbarSelectClassName}
                  value={departmentFilter}
                  onChange={(e) => onDepartmentFilterChange(e.target.value)}
                  aria-label="Filter by department"
                >
                  <option value="ALL">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <select
                  className={toolbarSelectClassName}
                  value={teamFilter}
                  onChange={(e) => onTeamFilterChange(e.target.value)}
                  aria-label="Filter by team"
                >
                  <option value="ALL">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <select
                  className={toolbarSelectClassName}
                  value={roleFilter}
                  onChange={(e) =>
                    onRoleFilterChange(
                      e.target.value as "ALL" | "ADMIN" | "EMPLOYEE",
                    )
                  }
                  aria-label="Filter by role"
                >
                  <option value="ALL">All roles</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  className={toolbarSelectClassName}
                  value={managerFilter}
                  onChange={(e) => onManagerFilterChange(e.target.value)}
                  aria-label="Filter by manager"
                >
                  <option value="ALL">All managers</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <div className="flex shrink-0 gap-1 rounded-lg border border-border/50 p-1">
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                aria-label="Card view"
                aria-pressed={viewMode === "cards"}
                onClick={() => onViewModeChange("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => onViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {canManage ? (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={onExportCsv}
                disabled={exportCsvPending || !onExportCsv}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            ) : null}
            {canManageOrg ? (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={onAddDepartment}
              >
                <Building2 className="h-4 w-4" />
                Department
              </Button>
            ) : null}
          </div>

          {isLoading ? <DirectorySkeleton viewMode={viewMode} /> : null}
          {isError ? (
            <ErrorState
              description={
                error instanceof ApiClientError
                  ? error.message
                  : "Could not load employees."
              }
              onRetry={onRetry}
            />
          ) : null}
          {!isLoading && !isError && employees.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No employees found"
              description={
                canManage
                  ? "Hire employees to build your company directory."
                  : "Your employee profile is not available yet."
              }
            />
          ) : null}

          {!isLoading && !isError && employees.length > 0 && viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((employee) => (
                <Card
                  key={employee.id}
                  className="border-border/50 transition-colors hover:border-primary/40"
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <EmployeeAvatar
                        name={formatEmployeeName(employee)}
                        photoUrl={employee.photoUrl ?? employee.user?.avatarUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="truncate font-medium hover:underline"
                          onClick={() => onViewProfile(employee.id)}
                        >
                          {formatEmployeeName(employee)}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {employee.employeeCode}
                          {employee.adminCode ? ` · ${employee.adminCode}` : ""}
                        </p>
                        <div className="mt-1">
                          <StatusPill
                            label={EMPLOYEE_STATUS_LABELS[employee.status]}
                            tone={employeeStatusTone(employee.status)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      <p>{employee.designation ?? "No designation"}</p>
                      <p>{employee.department?.name ?? "No department"}</p>
                      <p>{employee.primaryTeam?.name ?? "No team"}</p>
                      <p>
                        Manager:{" "}
                        {employee.manager
                          ? `${employee.manager.firstName} ${employee.manager.lastName}`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewProfile(employee.id)}
                      >
                        View
                      </Button>
                      {canManage ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditEmployee(employee)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${formatEmployeeName(employee)}`}
                            onClick={() => onDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {!isLoading && !isError && employees.length > 0 && viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th
                      className="pb-3 pr-4 font-medium"
                      scope="col"
                      aria-sort={
                        sortBy === "employeeCode"
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <DirectorySortButton
                        label="ID"
                        field="employeeCode"
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium" scope="col">
                      Department
                    </th>
                    <th className="pb-3 pr-4 font-medium" scope="col">
                      Team
                    </th>
                    <th
                      className="pb-3 pr-4 font-medium"
                      scope="col"
                      aria-sort={
                        sortBy === "status"
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <DirectorySortButton
                        label="Status"
                        field="status"
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
                      />
                    </th>
                    <th
                      className="pb-3 pr-4 font-medium"
                      scope="col"
                      aria-sort={
                        sortBy === "designation"
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <DirectorySortButton
                        label="Designation"
                        field="designation"
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
                      />
                    </th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-border/50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar
                            name={formatEmployeeName(employee)}
                            photoUrl={
                              employee.photoUrl ?? employee.user?.avatarUrl
                            }
                            size="sm"
                          />
                          <div>
                            <button
                              type="button"
                              className="font-medium hover:underline"
                              onClick={() => onViewProfile(employee.id)}
                            >
                              {formatEmployeeName(employee)}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {employee.designation ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{employee.employeeCode}</td>
                      <td className="py-3 pr-4">
                        {employee.department?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {employee.primaryTeam?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill
                          label={EMPLOYEE_STATUS_LABELS[employee.status]}
                          tone={employeeStatusTone(employee.status)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        {employee.designation ?? "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewProfile(employee.id)}
                          >
                            View
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEditEmployee(employee)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete ${formatEmployeeName(employee)}`}
                                onClick={() => onDeleteEmployee(employee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function DepartmentsPanel({
  departments,
  teams,
  isLoading,
  isError,
  error,
  onRetry,
  canManageOrg,
  onEdit,
  onViewMembers,
}: {
  departments: Department[];
  employees: EmployeeProfile[];
  teams: Team[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  canManageOrg: boolean;
  onEdit: (dept: Department) => void;
  onViewMembers: (departmentId: string) => void;
}) {
  if (isLoading) return <LoadingState label="Loading departments" />;
  if (isError) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load departments."
        }
        onRetry={onRetry}
      />
    );
  }
  if (departments.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No departments"
        description="Create departments to organize your workforce."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {departments.map((dept) => {
        const deptTeams = teams.filter((t) => t.departmentId === dept.id);
        return (
          <Card key={dept.id} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{dept.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{dept.code}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Head: </span>
                {dept.head
                  ? `${dept.head.firstName} ${dept.head.lastName}`
                  : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Employees: </span>
                {dept.employeeCount ?? 0}
              </p>
              <p>
                <span className="text-muted-foreground">Teams: </span>
                {dept.teamCount ?? deptTeams.length}
              </p>
              {dept.description ? (
                <p className="text-muted-foreground">{dept.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewMembers(dept.id)}
                >
                  Members
                </Button>
                {canManageOrg ? (
                  <Button size="sm" variant="outline" onClick={() => onEdit(dept)}>
                    Edit
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function TeamsPanel({
  teams,
  departments,
  employees,
  isLoading,
  isError,
  error,
  onRetry,
  canManage,
  canManageOrg,
  onEditTeam,
  onDeleteTeam,
  onAddMember,
  onRemoveMember,
  onTransferMember,
}: {
  teams: Team[];
  departments: Department[];
  employees: EmployeeProfile[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  canManage: boolean;
  canManageOrg: boolean;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (id: string) => void;
  onAddMember: (teamId: string, userId: string) => void;
  onRemoveMember: (teamId: string, userId: string) => void;
  onTransferMember: (fromTeamId: string, userId: string, toTeamId: string) => void;
}) {
  const [manageTeam, setManageTeam] = useState<Team | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  const [transferToTeamId, setTransferToTeamId] = useState("");

  if (isLoading) return <LoadingState label="Loading teams" />;
  if (isError) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load teams."
        }
        onRetry={onRetry}
      />
    );
  }
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No teams yet"
        description="Create teams to group employees around projects or functions."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const dept = departments.find((d) => d.id === team.departmentId);
          return (
            <Card key={team.id} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{team.name}</CardTitle>
                {team.description ? (
                  <p className="text-sm text-muted-foreground">
                    {team.description}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>
                    {team.memberCount ?? team.members?.length ?? 0} members
                  </span>
                  {dept ? <span>· {dept.name}</span> : null}
                  {team.leader ? (
                    <span>
                      · Lead: {team.leader.firstName} {team.leader.lastName}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setManageTeam(team);
                        setAddUserId("");
                        setTransferUserId("");
                        setTransferToTeamId("");
                      }}
                    >
                      Manage members
                    </Button>
                  ) : null}
                  {canManageOrg ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditTeam(team)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(manageTeam)}
        onOpenChange={(open) => !open && setManageTeam(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage {manageTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-3">
                {(manageTeam?.members ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  manageTeam?.members?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {member.user
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.userId}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          manageTeam &&
                          onRemoveMember(manageTeam.id, member.userId)
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add member</Label>
              <div className="flex gap-2">
                <select
                  className={cn(selectClassName, "flex-1")}
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                >
                  <option value="">Select employee</option>
                  {employees
                    .filter(
                      (e) =>
                        !manageTeam?.members?.some((m) => m.userId === e.userId),
                    )
                    .map((e) => (
                      <option key={e.userId} value={e.userId}>
                        {formatEmployeeName(e)}
                      </option>
                    ))}
                </select>
                <Button
                  disabled={!addUserId || !manageTeam}
                  onClick={() => {
                    if (manageTeam && addUserId) {
                      onAddMember(manageTeam.id, addUserId);
                      setAddUserId("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transfer member</Label>
              <select
                className={selectClassName}
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
              >
                <option value="">Select member</option>
                {manageTeam?.members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user
                      ? `${m.user.firstName} ${m.user.lastName}`
                      : m.userId}
                  </option>
                ))}
              </select>
              <select
                className={selectClassName}
                value={transferToTeamId}
                onChange={(e) => setTransferToTeamId(e.target.value)}
              >
                <option value="">Destination team</option>
                {teams
                  .filter((t) => t.id !== manageTeam?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <Button
                disabled={!transferUserId || !transferToTeamId || !manageTeam}
                onClick={() => {
                  if (manageTeam && transferUserId && transferToTeamId) {
                    onTransferMember(
                      manageTeam.id,
                      transferUserId,
                      transferToTeamId,
                    );
                    setTransferUserId("");
                    setTransferToTeamId("");
                  }
                }}
              >
                Transfer
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTeam(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminsPanel({
  admins,
  departments,
  isLoading,
  isError,
  error,
  onRetry,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortDir,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  canManageOrg,
  onViewProfile,
  onEditAdmin,
  onSuspendAdmin,
  onActivateAdmin,
  onResetPassword,
  onDeleteAdmin,
  onExportCsv,
  exportCsvPending,
}: {
  admins: EmployeeProfile[];
  departments: Department[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: EmployeeStatusValue | "ALL";
  onStatusFilterChange: (value: EmployeeStatusValue | "ALL") => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  viewMode: "list" | "cards";
  onViewModeChange: (mode: "list" | "cards") => void;
  sortBy?: ListEmployeesQueryInput["sortBy"];
  sortDir?: ListEmployeesQueryInput["sortDir"];
  onSortChange?: (
    sortBy: ListEmployeesQueryInput["sortBy"],
    sortDir: ListEmployeesQueryInput["sortDir"],
  ) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canManageOrg: boolean;
  onViewProfile: (id: string) => void;
  onEditAdmin: (admin: EmployeeProfile) => void;
  onSuspendAdmin: (admin: EmployeeProfile) => void;
  onActivateAdmin: (admin: EmployeeProfile) => void;
  onResetPassword: (admin: EmployeeProfile) => void;
  onDeleteAdmin: (id: string) => void;
  onExportCsv?: () => void;
  exportCsvPending?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 max-w-md flex-1 basis-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search admins by name, ID, email…"
                aria-label="Search admins"
                className="pl-9"
              />
            </div>
            {canManageOrg ? (
              <>
                <select
                  className={toolbarSelectClassName}
                  value={statusFilter}
                  onChange={(e) =>
                    onStatusFilterChange(
                      e.target.value as EmployeeStatusValue | "ALL",
                    )
                  }
                  aria-label="Filter by status"
                >
                  <option value="ALL">All statuses</option>
                  {EMPLOYEE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {EMPLOYEE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <select
                  className={toolbarSelectClassName}
                  value={departmentFilter}
                  onChange={(e) => onDepartmentFilterChange(e.target.value)}
                  aria-label="Filter by department"
                >
                  <option value="ALL">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <div className="flex shrink-0 gap-1 rounded-lg border border-border/50 p-1">
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                aria-label="Card view"
                aria-pressed={viewMode === "cards"}
                onClick={() => onViewModeChange("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => onViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {canManageOrg ? (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={onExportCsv}
                disabled={exportCsvPending || !onExportCsv}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            ) : null}
          </div>

          {isLoading ? <DirectorySkeleton viewMode={viewMode} /> : null}
          {isError ? (
            <ErrorState
              description={
                error instanceof ApiClientError
                  ? error.message
                  : "Could not load admins."
              }
              onRetry={onRetry}
            />
          ) : null}
          {!isLoading && !isError && admins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No admins found"
              description="Super Admin can create administrators for the organization."
            />
          ) : null}

          {!isLoading && !isError && admins.length > 0 && viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {admins.map((admin) => (
                <Card
                  key={admin.id}
                  className="border-border/50 transition-colors hover:border-primary/40"
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <EmployeeAvatar
                        name={formatEmployeeName(admin)}
                        photoUrl={admin.photoUrl ?? admin.user?.avatarUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="truncate font-medium hover:underline"
                          onClick={() => onViewProfile(admin.id)}
                        >
                          {formatEmployeeName(admin)}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {admin.adminCode ?? admin.employeeCode}
                        </p>
                        <div className="mt-1">
                          <StatusPill
                            label={EMPLOYEE_STATUS_LABELS[admin.status]}
                            tone={employeeStatusTone(admin.status)}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {admin.user?.email}
                    </p>
                    <p className="text-sm">{admin.department?.name ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {admin.designation ?? "Administrator"}
                    </p>
                    {canManageOrg ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewProfile(admin.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditAdmin(admin)}
                        >
                          Edit
                        </Button>
                        {admin.status === "ACTIVE" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSuspendAdmin(admin)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onActivateAdmin(admin)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResetPassword(admin)}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${formatEmployeeName(admin)}`}
                          onClick={() => onDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewProfile(admin.id)}
                      >
                        View
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {!isLoading && !isError && admins.length > 0 && viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Admin</th>
                    <th className="pb-3 pr-4 font-medium" scope="col">
                      <DirectorySortButton
                        label="Admin ID"
                        field="employeeCode"
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium">Department</th>
                    <th className="pb-3 pr-4 font-medium" scope="col">
                      <DirectorySortButton
                        label="Status"
                        field="status"
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium">Designation</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-border/50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar
                            name={formatEmployeeName(admin)}
                            photoUrl={admin.photoUrl ?? admin.user?.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <button
                              type="button"
                              className="font-medium hover:underline"
                              onClick={() => onViewProfile(admin.id)}
                            >
                              {formatEmployeeName(admin)}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {admin.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {admin.adminCode ?? admin.employeeCode}
                      </td>
                      <td className="py-3 pr-4">
                        {admin.department?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill
                          label={EMPLOYEE_STATUS_LABELS[admin.status]}
                          tone={employeeStatusTone(admin.status)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        {admin.designation ?? "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewProfile(admin.id)}
                          >
                            View
                          </Button>
                          {canManageOrg ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEditAdmin(admin)}
                              >
                                Edit
                              </Button>
                              {admin.status === "ACTIVE" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSuspendAdmin(admin)}
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onActivateAdmin(admin)}
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onResetPassword(admin)}
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteAdmin(admin.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

type ProfileSection =
  | "personal"
  | "attendance"
  | "leaves"
  | "performance"
  | "documents"
  | "timeline"
  | "career"
  | "id-card";

const PROFILE_SECTIONS: readonly ProfileSection[] = [
  "personal",
  "attendance",
  "leaves",
  "performance",
  "documents",
  "timeline",
  "career",
  "id-card",
];

function profileSectionLabel(section: ProfileSection): string {
  switch (section) {
    case "personal":
      return "Personal";
    case "attendance":
      return "Attendance";
    case "leaves":
      return "Leaves";
    case "performance":
      return "Performance";
    case "documents":
      return "Documents";
    case "timeline":
      return "Timeline";
    case "career":
      return "Career";
    case "id-card":
      return "ID card";
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

function openPrintWindow(html: string, title: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
}

export function EmployeeProfileSheet({
  open,
  onOpenChange,
  employee,
  isLoading,
  canManage,
  attendance = [],
  leaves = [],
  reviews = [],
  goals = [],
  departments = [],
  teams = [],
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeProfile;
  isLoading: boolean;
  canManage: boolean;
  attendance?: Attendance[];
  leaves?: LeaveRequest[];
  reviews?: PerformanceReview[];
  goals?: EmployeeGoal[];
  departments?: Department[];
  teams?: Team[];
  onEdit: () => void;
}) {
  const [section, setSection] = useState<ProfileSection>("personal");
  const [documents, setDocuments] = useState<EmployeeDocumentDto[]>([]);
  const [timeline, setTimeline] = useState<EmployeeTimelineEventDto[]>([]);
  const [promotions, setPromotions] = useState<EmployeePromotionDto[]>([]);
  const [transfers, setTransfers] = useState<EmployeeTransferDto[]>([]);
  const [hrDataLoading, setHrDataLoading] = useState(false);
  const [hrDataError, setHrDataError] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docMime, setDocMime] = useState("");
  const [docFileSize, setDocFileSize] = useState("");
  const [docType, setDocType] = useState<DocumentTypeValue>("OTHER");
  const [docSaving, setDocSaving] = useState(false);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [promotionFormOpen, setPromotionFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [promotionDate, setPromotionDate] = useState("");
  const [promotionDesignation, setPromotionDesignation] = useState("");
  const [promotionReason, setPromotionReason] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferDepartmentId, setTransferDepartmentId] = useState("");
  const [transferTeamId, setTransferTeamId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [careerSaving, setCareerSaving] = useState(false);

  const attendanceSummary = useMemo(() => {
    const present = attendance.filter((record) =>
      ["PRESENT", "REMOTE", "HALF_DAY"].includes(record.status),
    ).length;
    const absent = attendance.filter((record) => record.status === "ABSENT").length;
    const late = attendance.filter((record) => record.isLate).length;
    const workingMinutes = attendance.reduce(
      (total, record) => total + (record.workingMinutes ?? 0),
      0,
    );
    return { present, absent, late, workingMinutes };
  }, [attendance]);

  const loadHrData = useCallback(async (employeeId: string) => {
    setHrDataLoading(true);
    setHrDataError(null);
    try {
      const [docsResult, timelineResult, promotionsResult, transfersResult] =
        await Promise.all([
          teamService.listDocuments(employeeId),
          teamService.listTimeline(employeeId),
          teamService.listPromotions(employeeId),
          teamService.listTransfers(employeeId),
        ]);
      setDocuments(docsResult.items);
      setTimeline(timelineResult.items);
      setPromotions(Array.isArray(promotionsResult) ? promotionsResult : []);
      setTransfers(Array.isArray(transfersResult) ? transfersResult : []);
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not load HR profile data.",
      );
    } finally {
      setHrDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !employee?.id) return;
    void loadHrData(employee.id);
  }, [employee?.id, loadHrData, open]);

  useEffect(() => {
    if (!open) {
      setSection("personal");
      setDocTitle("");
      setDocUrl("");
      setDocMime("");
      setDocFileSize("");
      setDocType("OTHER");
      setPromotionFormOpen(false);
      setTransferFormOpen(false);
    }
  }, [open]);

  const handleAddDocument = async () => {
    if (!employee || !docTitle.trim() || !docUrl.trim()) return;

    const mime = docMime.trim() || null;
    const parsedSize = docFileSize.trim() ? Number(docFileSize) : null;
    if (
      parsedSize != null &&
      (Number.isNaN(parsedSize) ||
        parsedSize < 0 ||
        parsedSize > MAX_DOCUMENT_BYTES)
    ) {
      setHrDataError("File size must be between 0 and 15 MB.");
      return;
    }
    if (mime && mime.length > 100) {
      setHrDataError("MIME type is too long.");
      return;
    }

    setDocSaving(true);
    try {
      await teamService.addDocument(employee.id, {
        type: docType,
        title: docTitle.trim(),
        fileUrl: docUrl.trim(),
        mimeType: mime,
        fileSize: parsedSize,
      });
      setDocTitle("");
      setDocUrl("");
      setDocMime("");
      setDocFileSize("");
      await loadHrData(employee.id);
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not add document.",
      );
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!employee || !window.confirm("Delete this document?")) return;
    try {
      await teamService.deleteDocument(employee.id, documentId);
      await loadHrData(employee.id);
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not delete document.",
      );
    }
  };

  const handlePrintIdCard = async () => {
    if (!employee) return;
    setIdCardLoading(true);
    try {
      const card = await teamService.getIdCard(employee.id);
      if (card.frontHtml) {
        openPrintWindow(card.frontHtml, `ID Card - ${employee.employeeCode}`);
      }
      if (card.backHtml) {
        openPrintWindow(card.backHtml, `ID Card Back - ${employee.employeeCode}`);
      }
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not generate ID card.",
      );
    } finally {
      setIdCardLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    if (!employee || !promotionDate || !promotionDesignation.trim()) return;
    setCareerSaving(true);
    try {
      await teamService.createPromotion(employee.id, {
        effectiveDate: promotionDate,
        newDesignation: promotionDesignation.trim(),
        reason: promotionReason.trim() || null,
      });
      setPromotionFormOpen(false);
      setPromotionDate("");
      setPromotionDesignation("");
      setPromotionReason("");
      await loadHrData(employee.id);
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not record promotion.",
      );
    } finally {
      setCareerSaving(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!employee || !transferDate) return;
    setCareerSaving(true);
    try {
      await teamService.createHrTransfer(employee.id, {
        effectiveDate: transferDate,
        toDepartmentId: transferDepartmentId || null,
        toTeamId: transferTeamId || null,
        reason: transferReason.trim() || null,
      });
      setTransferFormOpen(false);
      setTransferDate("");
      setTransferDepartmentId("");
      setTransferTeamId("");
      setTransferReason("");
      await loadHrData(employee.id);
    } catch (error) {
      setHrDataError(
        error instanceof ApiClientError
          ? error.message
          : "Could not record transfer.",
      );
    } finally {
      setCareerSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Employee profile</SheetTitle>
        </SheetHeader>
        {isLoading ? <LoadingState label="Loading profile" /> : null}
        {!isLoading && employee ? (
          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-4">
              <EmployeeAvatar
                name={formatEmployeeName(employee)}
                photoUrl={employee.photoUrl ?? employee.user?.avatarUrl}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold">
                  {formatEmployeeName(employee)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {employee.designation ?? "No designation"} ·{" "}
                  {employee.employeeCode}
                  {employee.adminCode ? ` · ${employee.adminCode}` : ""}
                </p>
                <div className="mt-2">
                  <StatusPill
                    label={EMPLOYEE_STATUS_LABELS[employee.status]}
                    tone={employeeStatusTone(employee.status)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROFILE_SECTIONS.map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={section === key ? "default" : "outline"}
                  onClick={() => setSection(key)}
                >
                  {profileSectionLabel(key)}
                </Button>
              ))}
            </div>

            {hrDataError ? (
              <div
                className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
                role="alert"
              >
                <p className="flex-1 text-sm text-destructive">{hrDataError}</p>
                {employee ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void loadHrData(employee.id);
                    }}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
            {hrDataLoading &&
            (section === "documents" ||
              section === "timeline" ||
              section === "career") ? (
              <LoadingState label="Loading HR data" />
            ) : null}

            {section === "personal" ? (
              <div className="grid gap-3 text-sm">
                {[
                  ["Login email", employee.user?.email ?? "—"],
                  ["Company email", employee.companyEmail ?? "—"],
                  ["Personal email", employee.personalEmail ?? "—"],
                  ["Phone", employee.phone ?? "—"],
                  ["Father name", employee.fatherName ?? "—"],
                  [
                    "Marital status",
                    employee.maritalStatus
                      ? MARITAL_STATUS_LABELS[employee.maritalStatus]
                      : "—",
                  ],
                  ["Blood group", employee.bloodGroup ?? "—"],
                  ["City", employee.city ?? "—"],
                  ["Country", employee.country ?? "—"],
                  [
                    "Shift",
                    employee.shift ? WORK_SHIFT_LABELS[employee.shift] : "—",
                  ],
                  [
                    "Lifecycle stage",
                    employee.lifecycleStage
                      ? LIFECYCLE_STAGE_LABELS[employee.lifecycleStage]
                      : "—",
                  ],
                  ["Badge number", employee.badgeNumber ?? "—"],
                  ["QR token", employee.qrToken ?? "—"],
                  ["CNIC / National ID", employee.nationalId ?? "—"],
                  [
                    "Gender",
                    employee.gender
                      ? EMPLOYEE_GENDER_LABELS[employee.gender]
                      : "—",
                  ],
                  ["Date of birth", formatDate(employee.dateOfBirth)],
                  ["Joining date", formatDate(employee.hireDate)],
                  [
                    "Employment type",
                    employee.employmentType
                      ? EMPLOYMENT_TYPE_LABELS[employee.employmentType]
                      : "—",
                  ],
                  ["Department", employee.department?.name ?? "—"],
                  ["Team", employee.primaryTeam?.name ?? "—"],
                  ["Work location", employee.workLocation ?? "—"],
                  ["Address", employee.address ?? "—"],
                  [
                    "Salary",
                    employee.salary != null
                      ? employee.salary.toLocaleString()
                      : "—",
                  ],
                  [
                    "Manager",
                    employee.manager
                      ? `${employee.manager.firstName} ${employee.manager.lastName}`
                      : "—",
                  ],
                  [
                    "Emergency contact",
                    employee.emergencyContactName
                      ? `${employee.emergencyContactName}${
                          employee.emergencyContactPhone
                            ? ` · ${employee.emergencyContactPhone}`
                            : ""
                        }`
                      : "—",
                  ],
                  ["Created by", formatCreatedBy(employee.createdBy)],
                  ["Created", formatDateTime(employee.createdAt)],
                  ["Last updated", formatDateTime(employee.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                {employee.notes ? (
                  <div>
                    <p className="mb-1 font-medium">Notes</p>
                    <p className="text-muted-foreground">{employee.notes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {section === "attendance" ? (
              <div className="space-y-3 text-sm">
                {attendance.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 p-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="font-semibold">{attendanceSummary.present}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Absent</p>
                      <p className="font-semibold">{attendanceSummary.absent}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Late</p>
                      <p className="font-semibold">{attendanceSummary.late}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Working hours</p>
                      <p className="font-semibold">
                        {formatMinutes(attendanceSummary.workingMinutes)}
                      </p>
                    </div>
                  </div>
                ) : null}
                {attendance.length === 0 ? (
                  <p className="text-muted-foreground">No attendance records.</p>
                ) : (
                  attendance.slice(0, 10).map((record) => (
                    <div
                      key={record.id}
                      className="flex justify-between rounded-lg border border-border/50 px-3 py-2"
                    >
                      <span>{formatDate(record.date)}</span>
                      <span>
                        {ATTENDANCE_STATUS_LABELS[record.status]}
                        {record.isLate ? " · Late" : ""}
                        {record.workingMinutes
                          ? ` · ${formatMinutes(record.workingMinutes)}`
                          : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {section === "leaves" ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Annual</p>
                    <p className="font-semibold">{employee.annualLeaveBalance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Casual</p>
                    <p className="font-semibold">
                      {employee.casualLeaveBalance ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Medical</p>
                    <p className="font-semibold">
                      {employee.medicalLeaveBalance ?? employee.sickLeaveBalance}
                    </p>
                  </div>
                </div>
                {leaves.length === 0 ? (
                  <p className="text-muted-foreground">No leave requests.</p>
                ) : (
                  leaves.slice(0, 10).map((leave) => (
                    <div
                      key={leave.id}
                      className="rounded-lg border border-border/50 px-3 py-2"
                    >
                      {LEAVE_TYPE_LABELS[leave.type]} ·{" "}
                      {LEAVE_STATUS_LABELS[leave.status]} ·{" "}
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {section === "performance" ? (
              <div className="space-y-3 text-sm">
                {reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-border/50 px-3 py-2"
                  >
                    {review.periodLabel} ·{" "}
                    {PERFORMANCE_RATING_LABELS[review.rating]} ·{" "}
                    {review.productivityScore}%
                  </div>
                ))}
                {goals.slice(0, 5).map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-border/50 px-3 py-2"
                  >
                    {goal.title} · {GOAL_STATUS_LABELS[goal.status]} ·{" "}
                    {goal.progress}%
                  </div>
                ))}
                {reviews.length === 0 && goals.length === 0 ? (
                  <p className="text-muted-foreground">
                    No performance data yet.
                  </p>
                ) : null}
              </div>
            ) : null}

            {section === "documents" ? (
              <div className="space-y-3 text-sm">
                {canManage ? (
                  <div className="space-y-2 rounded-lg border border-border/50 p-3">
                    <p className="font-medium">Add document</p>
                    <Input
                      placeholder="Title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                    />
                    <Input
                      placeholder="File URL"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                    />
                    <select
                      className={selectClassName}
                      value={docType}
                      onChange={(e) =>
                        setDocType(e.target.value as DocumentTypeValue)
                      }
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={docSaving || !docTitle.trim() || !docUrl.trim()}
                      onClick={() => void handleAddDocument()}
                    >
                      Add document
                    </Button>
                  </div>
                ) : null}
                {documents.length === 0 ? (
                  <p className="text-muted-foreground">No documents linked.</p>
                ) : (
                  documents.map((doc) => {
                    const mime = doc.mimeType ?? inferMimeFromUrl(doc.fileUrl);
                    return (
                      <div
                        key={doc.id}
                        className="space-y-2 rounded-lg border border-border/50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {DOCUMENT_TYPE_LABELS[doc.type]} ·{" "}
                              {formatDateTime(doc.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              aria-label={`Open ${doc.title}`}
                            >
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            {canManage ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete ${doc.title}`}
                                onClick={() => void handleDeleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        {isImageMime(mime) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={doc.fileUrl}
                            alt={doc.title}
                            className="max-h-40 w-full rounded-md object-contain bg-muted/40"
                          />
                        ) : null}
                        {isPdfMime(mime) ? (
                          <iframe
                            title={`Preview ${doc.title}`}
                            src={doc.fileUrl}
                            className="h-48 w-full rounded-md border border-border/40"
                          />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {section === "timeline" ? (
              <div className="space-y-2 text-sm">
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground">No timeline events yet.</p>
                ) : (
                  timeline.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border/50 px-3 py-2"
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.eventType} · {formatDateTime(event.createdAt)}
                      </p>
                      {event.description ? (
                        <p className="mt-1 text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {section === "career" ? (
              <div className="space-y-4 text-sm">
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPromotionFormOpen((value) => !value)}
                    >
                      Add promotion
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTransferFormOpen((value) => !value)}
                    >
                      Add transfer
                    </Button>
                  </div>
                ) : null}
                {promotionFormOpen && canManage ? (
                  <div className="space-y-2 rounded-lg border border-border/50 p-3">
                    <Input
                      type="date"
                      value={promotionDate}
                      onChange={(e) => setPromotionDate(e.target.value)}
                    />
                    <Input
                      placeholder="New designation"
                      value={promotionDesignation}
                      onChange={(e) => setPromotionDesignation(e.target.value)}
                    />
                    <Input
                      placeholder="Reason (optional)"
                      value={promotionReason}
                      onChange={(e) => setPromotionReason(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={
                        careerSaving ||
                        !promotionDate ||
                        !promotionDesignation.trim()
                      }
                      onClick={() => void handleCreatePromotion()}
                    >
                      Save promotion
                    </Button>
                  </div>
                ) : null}
                {transferFormOpen && canManage ? (
                  <div className="space-y-2 rounded-lg border border-border/50 p-3">
                    <Input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                    />
                    <select
                      className={selectClassName}
                      value={transferDepartmentId}
                      onChange={(e) => setTransferDepartmentId(e.target.value)}
                    >
                      <option value="">Destination department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectClassName}
                      value={transferTeamId}
                      onChange={(e) => setTransferTeamId(e.target.value)}
                    >
                      <option value="">Destination team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Reason (optional)"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={careerSaving || !transferDate}
                      onClick={() => void handleCreateTransfer()}
                    >
                      Save transfer
                    </Button>
                  </div>
                ) : null}
                <div>
                  <p className="mb-2 font-medium">Promotions</p>
                  {promotions.length === 0 ? (
                    <p className="text-muted-foreground">No promotions recorded.</p>
                  ) : (
                    promotions.map((promotion) => (
                      <div
                        key={promotion.id}
                        className="mb-2 rounded-lg border border-border/50 px-3 py-2"
                      >
                        {formatDate(promotion.effectiveDate)} ·{" "}
                        {promotion.oldDesignation ?? "—"} →{" "}
                        {promotion.newDesignation}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="mb-2 font-medium">Transfers</p>
                  {transfers.length === 0 ? (
                    <p className="text-muted-foreground">No transfers recorded.</p>
                  ) : (
                    transfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="mb-2 rounded-lg border border-border/50 px-3 py-2"
                      >
                        {formatDate(transfer.effectiveDate)}
                        {transfer.reason ? ` · ${transfer.reason}` : ""}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {section === "id-card" ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Generate a printable employee ID card with front and back layouts.
                </p>
                <Button
                  onClick={() => void handlePrintIdCard()}
                  disabled={idCardLoading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {idCardLoading ? "Generating…" : "Print ID card"}
                </Button>
              </div>
            ) : null}

            {canManage ? <Button onClick={onEdit}>Edit profile</Button> : null}
          </div>
        ) : null}
        {!isLoading && !employee ? (
          <ErrorState description="Employee profile could not be loaded." />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
