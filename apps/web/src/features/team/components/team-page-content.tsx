"use client";

import {
  GOAL_STATUSES,
  LEAVE_REQUEST_STATUSES,
  LEAVE_TYPES,
  PERFORMANCE_RATINGS,
  PERMISSIONS,
  type Attendance,
  type CreateAdminResult,
  type CreateDepartmentInput,
  type CreateEmployeeGoalInput,
  type CreateLeaveRequestInput,
  type CreatePerformanceReviewInput,
  type CreateTeamInput,
  type Department,
  type EmployeeGoal,
  type EmployeeProfile,
  type EmployeeStatusValue,
  type HireEmployeeResult,
  type LeaveRequest,
  type LeaveRequestStatusValue,
  type LeaveTypeValue,
  type ListEmployeesQueryInput,
  type PerformanceReview,
  type Team,
  type UpdateDepartmentInput,
  type UpdateEmployeeGoalInput,
  type UpdatePerformanceReviewInput,
  type UpdateTeamInput,
} from "@enterprise/shared";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Shield,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  useAdvancedPerformanceProfiler,
} from "@/features/performance";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import { AdminCreateDialog } from "./admin-create-dialog";
import { EmployeeProfileView } from "./employee-profile-view";
import { EmployeeHireDialog } from "./employee-hire-dialog";
import {
  LeaveWorkflowStepper,
  getLeaveWorkflowActionCopy,
  LEAVE_WORKFLOW_STAGE_LABELS,
} from "./leave-workflow-stepper";
import {
  AdminsPanel,
  DepartmentsPanel,
  DirectoryPanel,
  TeamsPanel,
} from "./team-hrms-panels";
import {
  leaveStatusTone,
  mutationError,
  selectClassName,
  StatusPill,
} from "./team-shared";
import {
  useAddTeamMembers,
  useCheckIn,
  useCheckOut,
  useCreateAdmin,
  useCreateDepartment,
  useCreateGoal,
  useCreateLeave,
  useCreatePerformance,
  useCreateTeam,
  useDeleteDepartment,
  useDeleteEmployee,
  useDeleteGoal,
  useDeleteTeam,
  useHireEmployee,
  useRemoveTeamMember,
  useResetEmployeeCredentials,
  useReviewLeave,
  useTransferTeamMember,
  useUpdateDepartment,
  useUpdateEmployee,
  useUpdateGoal,
  useUpdatePerformance,
  useUpdateTeam,
} from "../hooks/use-team-mutations";
import {
  useAttendance,
  useDepartments,
  useEmployee,
  useEmployees,
  useGoals,
  useLeaves,
  usePerformance,
  useTeamStatistics,
  useTeams,
} from "../hooks/use-team";
import {
  ATTENDANCE_STATUS_LABELS,
  GOAL_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  PERFORMANCE_RATING_LABELS,
  formatDate,
  formatDateTime,
  formatEmployeeName,
  formatMinutes,
  monthRange,
  todayDateOnly,
} from "../types/team.types";
import { teamService } from "../services/team.service";
import { PerformanceLiveDashboard } from "./performance-live-dashboard";

type TeamTab =
  | "overview"
  | "directory"
  | "departments"
  | "teams"
  | "admins"
  | "attendance"
  | "leave"
  | "performance";

const TAB_LABELS: Record<TeamTab, string> = {
  overview: "Overview",
  directory: "Directory",
  departments: "Departments",
  teams: "Teams",
  admins: "Admins",
  attendance: "Attendance",
  leave: "Leave",
  performance: "Performance",
};

function ProductivityBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center justify-between gap-4 p-6 pt-6 sm:p-6 sm:pt-6">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="icon-box icon-box-md rounded-lg bg-primary/10 text-primary">
          <Icon strokeWidth={1.75} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TeamPageContent() {
  useAdvancedPerformanceProfiler("TeamPageContent");

  const { isClient, isEmployee, isSuperAdmin } = useRole();
  const canManage = useHasPermission(PERMISSIONS.TEAM_MANAGE) && !isClient;
  const canManageOrg = isSuperAdmin;
  const currentUserId = useAuthStore((state) => state.user?.id);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusValue | "ALL">(
    "ALL",
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "EMPLOYEE">(
    "ALL",
  );
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] =
    useState<ListEmployeesQueryInput["sortBy"]>("employeeCode");
  const [sortDir, setSortDir] =
    useState<ListEmployeesQueryInput["sortDir"]>("asc");
  const [directoryView, setDirectoryView] = useState<"list" | "cards">("cards");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<
    LeaveRequestStatusValue | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [profileId, setProfileId] = useState<string | null>(null);
  const [departmentModal, setDepartmentModal] = useState<{
    open: boolean;
    editing: Department | null;
  }>({ open: false, editing: null });
  const [employeeModal, setEmployeeModal] = useState<{
    open: boolean;
    editing: EmployeeProfile | null;
  }>({ open: false, editing: null });
  const [adminModal, setAdminModal] = useState<{
    open: boolean;
    editing: EmployeeProfile | null;
  }>({ open: false, editing: null });
  const [hireResult, setHireResult] = useState<HireEmployeeResult | null>(null);
  const [adminResult, setAdminResult] = useState<CreateAdminResult | null>(null);
  const [teamModal, setTeamModal] = useState<{
    open: boolean;
    editing: Team | null;
  }>({ open: false, editing: null });
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [performanceModal, setPerformanceModal] = useState<{
    open: boolean;
    editing: PerformanceReview | null;
  }>({ open: false, editing: null });
  const [goalModal, setGoalModal] = useState<{
    open: boolean;
    editing: EmployeeGoal | null;
  }>({ open: false, editing: null });
  const [exportCsvPending, setExportCsvPending] = useState(false);

  useEntityDeepLink((openId) => {
    setActiveTab("directory");
    setProfileId(openId);
  });

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    setActiveTab("directory");
    setSearch(q);
  }, [searchParams]);

  const employeeQueryInput = useMemo<ListEmployeesQueryInput>(
    () => ({
      search: debouncedSearch,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      departmentId: departmentFilter === "ALL" ? undefined : departmentFilter,
      teamId: teamFilter === "ALL" ? undefined : teamFilter,
      role: roleFilter === "ALL" ? undefined : roleFilter,
      managerId: managerFilter === "ALL" ? undefined : managerFilter,
      sortBy,
      sortDir,
      page,
      limit,
    }),
    [
      debouncedSearch,
      statusFilter,
      departmentFilter,
      teamFilter,
      roleFilter,
      managerFilter,
      sortBy,
      sortDir,
      page,
      limit,
    ],
  );

  const adminsQueryInput = useMemo<ListEmployeesQueryInput>(
    () => ({
      ...employeeQueryInput,
      role: "ADMIN",
    }),
    [employeeQueryInput],
  );

  const { from: monthFrom, to: monthTo } = monthRange();
  const today = todayDateOnly();

  const statsQuery = useTeamStatistics();
  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees(employeeQueryInput);
  const managersQuery = useEmployees({ page: 1, limit: 100, search: "" });
  const adminsQuery = useEmployees(adminsQueryInput);
  const teamsQuery = useTeams();
  const attendanceQuery = useAttendance({
    from: monthFrom,
    to: monthTo,
    page: 1,
    limit: canManage ? 31 : 31,
  });
  const leavesQuery = useLeaves({
    status: leaveStatusFilter === "ALL" ? undefined : leaveStatusFilter,
    page: 1,
    limit: 20,
  });
  const performanceQuery = usePerformance({});
  const goalsQuery = useGoals({});
  const profileQuery = useEmployee(profileId);

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const hireEmployee = useHireEmployee();
  const createAdmin = useCreateAdmin();
  const resetCredentials = useResetEmployeeCredentials();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const addTeamMembers = useAddTeamMembers();
  const removeTeamMember = useRemoveTeamMember();
  const transferTeamMember = useTransferTeamMember();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const createLeave = useCreateLeave();
  const reviewLeaveMutation = useReviewLeave();
  const createPerformance = useCreatePerformance();
  const updatePerformance = useUpdatePerformance();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const departments = departmentsQuery.data?.items ?? [];
  const employees = useMemo(
    () => employeesQuery.data?.items ?? [],
    [employeesQuery.data?.items],
  );
  const managerOptions = managersQuery.data?.items ?? [];
  const admins = adminsQuery.data?.items ?? [];
  const teams = teamsQuery.data?.items ?? [];
  const attendance = attendanceQuery.data?.items ?? [];
  const leaves = leavesQuery.data?.items ?? [];
  const reviews = useMemo(
    () => performanceQuery.data?.items ?? [],
    [performanceQuery.data?.items],
  );
  const goals = goalsQuery.data?.items ?? [];
  const stats = statsQuery.data;

  const ownEmployee = useMemo(
    () => employees.find((e) => e.userId === currentUserId) ?? null,
    [employees, currentUserId],
  );

  const scopedEmployees = canManage
    ? employees
    : ownEmployee
      ? [ownEmployee]
      : employees.filter((e) => e.userId === currentUserId);

  const scopedAttendance = canManage
    ? attendance
    : attendance.filter((a) => a.employeeId === ownEmployee?.id);

  const scopedLeaves = canManage
    ? leaves
    : leaves.filter((l) => l.employeeId === ownEmployee?.id);

  const scopedReviews = canManage
    ? reviews
    : reviews.filter((r) => r.employeeId === ownEmployee?.id);

  const scopedGoals = canManage
    ? goals
    : goals.filter((g) => g.employeeId === ownEmployee?.id);

  const todayAttendance = scopedAttendance.find((a) => a.date === today);
  const canCheckIn = !todayAttendance?.checkInAt;
  const canCheckOut = Boolean(todayAttendance?.checkInAt && !todayAttendance?.checkOutAt);

  const productivityChart = useMemo(() => {
    const source = canManage ? reviews.slice(0, 6) : scopedReviews.slice(0, 4);
    return source.map((review) => ({
      label: formatEmployeeName(review.employee),
      value: review.productivityScore,
    }));
  }, [canManage, reviews, scopedReviews]);

  const headerAction = useMemo(() => {
    if (isClient) return {};
    if (activeTab === "directory" && canManage) {
      return {
        actionLabel: "Add Employee",
        onAction: () => {
          setHireResult(null);
          setEmployeeModal({ open: true, editing: null });
        },
      };
    }
    if (activeTab === "departments" && canManageOrg) {
      return {
        actionLabel: "Add department",
        onAction: () => setDepartmentModal({ open: true, editing: null }),
      };
    }
    if (activeTab === "teams" && canManageOrg) {
      return {
        actionLabel: "Create team",
        onAction: () => setTeamModal({ open: true, editing: null }),
      };
    }
    if (activeTab === "admins" && canManageOrg) {
      return {
        actionLabel: "Add Admin",
        onAction: () => {
          setAdminResult(null);
          setAdminModal({ open: true, editing: null });
        },
      };
    }
    if (activeTab === "attendance" && !canManage) {
      if (canCheckIn) {
        return {
          actionLabel: "Check in",
          onAction: () => checkIn.mutate({}),
        };
      }
      if (canCheckOut) {
        return {
          actionLabel: "Check out",
          onAction: () => checkOut.mutate({}),
        };
      }
    }
    if (activeTab === "leave") {
      return {
        actionLabel: "Request leave",
        onAction: () => setLeaveModalOpen(true),
      };
    }
    if (activeTab === "performance" && canManage) {
      return {
        actionLabel: "Add review",
        onAction: () => setPerformanceModal({ open: true, editing: null }),
      };
    }
    return {};
  }, [
    activeTab,
    canManage,
    canManageOrg,
    canCheckIn,
    canCheckOut,
    checkIn,
    checkOut,
    isClient,
  ]);

  const pageDescription = isClient
    ? "Team management is not available for client accounts."
    : canManage
      ? "Enterprise employee & organization management — departments, teams, directory, attendance, leave, and performance."
      : isEmployee
        ? "Check in, request leave, and track your profile and performance."
        : "View team information and HR workflows.";

  const visibleTabs = useMemo(() => {
    const tabs = Object.keys(TAB_LABELS) as TeamTab[];
    if (!canManage) {
      return tabs.filter((tab) => tab !== "admins" && tab !== "departments");
    }
    return tabs;
  }, [canManage]);

  if (isClient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" description={pageDescription} />
        <ErrorState
          title="Access restricted"
          description="Client accounts cannot access team management. Contact your account manager if you need assistance."
        />
      </div>
    );
  }

  const openProfileFromDirectory = (id: string) => {
    setActiveTab("directory");
    setProfileId(id);
  };

  const openProfile = (id: string) => {
    setProfileId(id);
  };

  const profileAttendance = profileQuery.data
    ? attendance.filter((a) => a.employeeId === profileQuery.data?.id)
    : [];
  const profileLeaves = profileQuery.data
    ? leaves.filter((l) => l.employeeId === profileQuery.data?.id)
    : [];
  const profileReviews = profileQuery.data
    ? reviews.filter((r) => r.employeeId === profileQuery.data?.id)
    : [];
  const profileGoals = profileQuery.data
    ? goals.filter((g) => g.employeeId === profileQuery.data?.id)
    : [];

  return (
    <div className="space-y-6">
      {adminModal.open ? (
        <AdminCreateDialog
          open={adminModal.open}
          editing={adminModal.editing}
          departments={departments}
          managers={managerOptions}
          onOpenChange={(open) => {
            if (!open) {
              setAdminModal({ open: false, editing: null });
              setAdminResult(null);
            } else {
              setAdminModal((current) => ({ ...current, open }));
            }
          }}
          onSubmit={(values) => {
            createAdmin.mutate(values, {
              onSuccess: (result) => setAdminResult(result),
            });
          }}
          onUpdate={(values) => {
            if (!adminModal.editing) return;
            updateEmployee.mutate(
              { id: adminModal.editing.id, input: values },
              {
                onSuccess: () =>
                  setAdminModal({ open: false, editing: null }),
              },
            );
          }}
          isPending={createAdmin.isPending || updateEmployee.isPending}
          error={createAdmin.error ?? updateEmployee.error ?? null}
          result={adminResult}
          onClearResult={() => setAdminResult(null)}
        />
      ) : employeeModal.open ? (
        <EmployeeHireDialog
          open={employeeModal.open}
          editing={employeeModal.editing}
          departments={departments}
          teams={teams}
          managers={managerOptions}
          onOpenChange={(open) => {
            if (!open) {
              setEmployeeModal({ open: false, editing: null });
              setHireResult(null);
            } else {
              setEmployeeModal((current) => ({ ...current, open }));
            }
          }}
          onHire={(values) => {
            hireEmployee.mutate(values, {
              onSuccess: (result) => setHireResult(result),
            });
          }}
          onUpdate={(values) => {
            if (!employeeModal.editing) return;
            updateEmployee.mutate(
              { id: employeeModal.editing.id, input: values },
              {
                onSuccess: () =>
                  setEmployeeModal({ open: false, editing: null }),
              },
            );
          }}
          isPending={hireEmployee.isPending || updateEmployee.isPending}
          error={hireEmployee.error ?? updateEmployee.error ?? null}
          hireResult={hireResult}
          onClearResult={() => setHireResult(null)}
        />
      ) : profileId ? (
        <EmployeeProfileView
          employee={profileQuery.data}
          isLoading={profileQuery.isLoading}
          canManage={canManage}
          canManageOrg={canManageOrg}
          departments={departments}
          teams={teams}
          attendance={profileAttendance}
          leaves={profileLeaves}
          reviews={profileReviews}
          goals={profileGoals}
          onBack={() => setProfileId(null)}
          onEdit={() => {
            if (profileQuery.data) {
              setProfileId(null);
              if (profileQuery.data.adminCode) {
                setAdminResult(null);
                setAdminModal({ open: true, editing: profileQuery.data });
              } else {
                setHireResult(null);
                setEmployeeModal({ open: true, editing: profileQuery.data });
              }
            }
          }}
        />
      ) : (
        <>
          <PageHeader
            title="Team"
            description={pageDescription}
            actionLabel={headerAction.actionLabel}
            onAction={headerAction.onAction}
          />

          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleTabs.map((tab) => (
              <TabButton
                key={tab}
                active={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
              >
                {TAB_LABELS[tab]}
              </TabButton>
            ))}
          </div>

          {activeTab === "overview" ? (
        <OverviewPanel
          stats={stats}
          isLoading={statsQuery.isLoading}
          isError={statsQuery.isError}
          error={statsQuery.error}
          onRetry={() => statsQuery.refetch()}
          productivityChart={productivityChart}
          pendingLeaves={scopedLeaves.filter((l) => l.status === "PENDING")}
          canManage={canManage}
          onReviewLeave={setReviewLeave}
        />
      ) : null}

      {activeTab === "directory" ? (
        <DirectoryPanel
          employees={canManage ? employees : scopedEmployees}
          departments={departments}
          teams={teams}
          isLoading={employeesQuery.isLoading}
          isError={employeesQuery.isError}
          error={employeesQuery.error}
          onRetry={() => employeesQuery.refetch()}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={(value) => {
            setDepartmentFilter(value);
            setPage(1);
          }}
          teamFilter={teamFilter}
          onTeamFilterChange={(value) => {
            setTeamFilter(value);
            setPage(1);
          }}
          roleFilter={roleFilter}
          onRoleFilterChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
          managerFilter={managerFilter}
          onManagerFilterChange={(value) => {
            setManagerFilter(value);
            setPage(1);
          }}
          managers={managerOptions}
          viewMode={directoryView}
          onViewModeChange={setDirectoryView}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(nextSortBy, nextSortDir) => {
            setSortBy(nextSortBy);
            setSortDir(nextSortDir);
            setPage(1);
          }}
          page={page}
          totalPages={employeesQuery.data?.pagination.totalPages ?? 1}
          onPageChange={setPage}
          canManage={canManage}
          canManageOrg={canManageOrg}
          onViewProfile={openProfileFromDirectory}
          onEditEmployee={(employee) => {
            setHireResult(null);
            setEmployeeModal({ open: true, editing: employee });
          }}
          onDeleteEmployee={(id) => {
            if (window.confirm("Remove this employee profile?")) {
              deleteEmployee.mutate(id);
            }
          }}
          onAddDepartment={() =>
            setDepartmentModal({ open: true, editing: null })
          }
          onExportCsv={
            canManage
              ? async () => {
                  setExportCsvPending(true);
                  try {
                    const { blob, filename } =
                      await teamService.exportDirectoryCsv();
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = filename;
                    anchor.click();
                    URL.revokeObjectURL(url);
                  } finally {
                    setExportCsvPending(false);
                  }
                }
              : undefined
          }
          exportCsvPending={exportCsvPending}
          departmentsLoading={departmentsQuery.isLoading}
        />
      ) : null}

      {activeTab === "departments" ? (
        <DepartmentsPanel
          departments={departments}
          employees={managerOptions}
          teams={teams}
          isLoading={departmentsQuery.isLoading}
          isError={departmentsQuery.isError}
          error={departmentsQuery.error}
          onRetry={() => departmentsQuery.refetch()}
          canManageOrg={canManageOrg}
          onEdit={(dept) => setDepartmentModal({ open: true, editing: dept })}
          onViewMembers={(departmentId) => {
            setDepartmentFilter(departmentId);
            setActiveTab("directory");
          }}
        />
      ) : null}

      {activeTab === "teams" ? (
        <TeamsPanel
          teams={teams}
          departments={departments}
          employees={managerOptions}
          isLoading={teamsQuery.isLoading}
          isError={teamsQuery.isError}
          error={teamsQuery.error}
          onRetry={() => teamsQuery.refetch()}
          canManage={canManage}
          canManageOrg={canManageOrg}
          onEditTeam={(team) => setTeamModal({ open: true, editing: team })}
          onDeleteTeam={(id) => {
            if (window.confirm("Delete this team?")) deleteTeam.mutate(id);
          }}
          onAddMember={(teamId, userId) =>
            addTeamMembers.mutate({ id: teamId, input: { userIds: [userId] } })
          }
          onRemoveMember={(teamId, userId) =>
            removeTeamMember.mutate({ teamId, userId })
          }
          onTransferMember={(fromTeamId, userId, toTeamId) =>
            transferTeamMember.mutate({
              teamId: fromTeamId,
              input: { userId, toTeamId },
            })
          }
        />
      ) : null}

      {activeTab === "admins" ? (
        <AdminsPanel
          admins={admins}
          departments={departments}
          isLoading={adminsQuery.isLoading}
          isError={adminsQuery.isError}
          error={adminsQuery.error}
          onRetry={() => adminsQuery.refetch()}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={(value) => {
            setDepartmentFilter(value);
            setPage(1);
          }}
          viewMode={directoryView}
          onViewModeChange={setDirectoryView}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(nextSortBy, nextSortDir) => {
            setSortBy(nextSortBy);
            setSortDir(nextSortDir);
            setPage(1);
          }}
          page={page}
          totalPages={adminsQuery.data?.pagination.totalPages ?? 1}
          onPageChange={setPage}
          canManageOrg={canManageOrg}
          onViewProfile={openProfile}
          onEditAdmin={(admin) => {
            setAdminResult(null);
            setAdminModal({ open: true, editing: admin });
          }}
          onSuspendAdmin={(admin) => {
            if (
              window.confirm(
                `Suspend ${formatEmployeeName(admin)}? They will no longer be able to sign in.`,
              )
            ) {
              updateEmployee.mutate({
                id: admin.id,
                input: { status: "INACTIVE" },
              });
            }
          }}
          onActivateAdmin={(admin) => {
            updateEmployee.mutate({
              id: admin.id,
              input: { status: "ACTIVE" },
            });
          }}
          onResetPassword={(admin) => {
            if (
              window.confirm(
                `Reset password for ${formatEmployeeName(admin)}? Their current password will be invalidated and a one-time setup link will be emailed.`,
              )
            ) {
              resetCredentials.mutate(
                { id: admin.id, sendEmail: true },
                {
                  onSuccess: (result) => {
                    const expiry = result.expiresAt
                      ? `\nLink expires at: ${new Date(result.expiresAt).toLocaleString()}`
                      : "";
                    window.alert(
                      result.invitationSent
                        ? `Password setup link emailed.${expiry}\n\nIf needed, copy the setup URL from the HR response securely.`
                        : result.passwordSetupUrl
                          ? `Password setup required.${expiry}\n\nShare this setup link securely (do not post in chat):\n${result.passwordSetupUrl}`
                          : `Credentials were reset. A password setup link was issued.${expiry}`,
                    );
                  },
                },
              );
            }
          }}
          onDeleteAdmin={(id) => {
            if (window.confirm("Remove this admin profile?")) {
              deleteEmployee.mutate(id);
            }
          }}
          onExportCsv={
            canManageOrg
              ? async () => {
                  setExportCsvPending(true);
                  try {
                    const { blob, filename } =
                      await teamService.exportDirectoryCsv();
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = filename || "admins.csv";
                    anchor.click();
                    URL.revokeObjectURL(url);
                  } finally {
                    setExportCsvPending(false);
                  }
                }
              : undefined
          }
          exportCsvPending={exportCsvPending}
        />
      ) : null}

      {activeTab === "attendance" ? (
        <AttendancePanel
          records={scopedAttendance}
          isLoading={attendanceQuery.isLoading}
          isError={attendanceQuery.isError}
          error={attendanceQuery.error}
          onRetry={() => attendanceQuery.refetch()}
          canManage={canManage}
          todayRecord={todayAttendance}
          onCheckIn={() => checkIn.mutate({})}
          onCheckOut={() => checkOut.mutate({})}
          checkInPending={checkIn.isPending}
          checkOutPending={checkOut.isPending}
        />
      ) : null}

      {activeTab === "leave" ? (
        <LeavePanel
          leaves={scopedLeaves}
          isLoading={leavesQuery.isLoading}
          isError={leavesQuery.isError}
          error={leavesQuery.error}
          onRetry={() => leavesQuery.refetch()}
          statusFilter={leaveStatusFilter}
          onStatusFilterChange={setLeaveStatusFilter}
          canManage={canManage}
          onReview={setReviewLeave}
          onRequestLeave={() => setLeaveModalOpen(true)}
        />
      ) : null}

      {activeTab === "performance" ? (
        <PerformancePanel
          reviews={scopedReviews}
          goals={scopedGoals}
          isLoading={performanceQuery.isLoading || goalsQuery.isLoading}
          isError={performanceQuery.isError || goalsQuery.isError}
          error={performanceQuery.error ?? goalsQuery.error}
          onRetry={() => {
            void performanceQuery.refetch();
            void goalsQuery.refetch();
          }}
          canManage={canManage}
          isSuperAdmin={isSuperAdmin}
          onEditReview={(review) =>
            setPerformanceModal({ open: true, editing: review })
          }
          onAddReview={() =>
            setPerformanceModal({ open: true, editing: null })
          }
          onAddGoal={() => setGoalModal({ open: true, editing: null })}
          onEditGoal={(goal) => setGoalModal({ open: true, editing: goal })}
          onDeleteGoal={(id) => {
            if (window.confirm("Delete this goal?")) deleteGoal.mutate(id);
          }}
        />
      ) : null}
        </>
      )}

      <DepartmentDialog
        open={departmentModal.open}
        editing={departmentModal.editing}
        employees={managerOptions}
        onOpenChange={(open) =>
          setDepartmentModal((current) => ({ ...current, open }))
        }
        onSubmit={(values) => {
          if (departmentModal.editing) {
            updateDepartment.mutate(
              { id: departmentModal.editing.id, input: values },
              {
                onSuccess: () =>
                  setDepartmentModal({ open: false, editing: null }),
              },
            );
          } else {
            createDepartment.mutate(values as CreateDepartmentInput, {
              onSuccess: () =>
                setDepartmentModal({ open: false, editing: null }),
            });
          }
        }}
        isPending={createDepartment.isPending || updateDepartment.isPending}
        error={
          createDepartment.error ?? updateDepartment.error ?? null
        }
        onDelete={
          departmentModal.editing
            ? () => {
                deleteDepartment.mutate(departmentModal.editing!.id, {
                  onSuccess: () =>
                    setDepartmentModal({ open: false, editing: null }),
                });
              }
            : undefined
        }
      />

      <TeamDialog
        open={teamModal.open}
        editing={teamModal.editing}
        departments={departments}
        onOpenChange={(open) => setTeamModal((current) => ({ ...current, open }))}
        onSubmit={(values) => {
          if (teamModal.editing) {
            updateTeam.mutate(
              { id: teamModal.editing.id, input: values },
              {
                onSuccess: () => setTeamModal({ open: false, editing: null }),
              },
            );
          } else {
            createTeam.mutate(values as CreateTeamInput, {
              onSuccess: () => setTeamModal({ open: false, editing: null }),
            });
          }
        }}
        isPending={createTeam.isPending || updateTeam.isPending}
        error={createTeam.error ?? updateTeam.error ?? null}
      />

      <LeaveRequestDialog
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        onSubmit={(values) => {
          createLeave.mutate(values, {
            onSuccess: () => setLeaveModalOpen(false),
          });
        }}
        isPending={createLeave.isPending}
        error={createLeave.error ?? null}
      />

      <LeaveReviewDialog
        leave={reviewLeave}
        onOpenChange={(open) => !open && setReviewLeave(null)}
        onSubmit={(status, reviewNote) => {
          if (!reviewLeave) return;
          reviewLeaveMutation.mutate(
            { id: reviewLeave.id, input: { status, reviewNote } },
            { onSuccess: () => setReviewLeave(null) },
          );
        }}
        isPending={reviewLeaveMutation.isPending}
        error={reviewLeaveMutation.error ?? null}
      />

      <PerformanceDialog
        open={performanceModal.open}
        editing={performanceModal.editing}
        employees={employees}
        onOpenChange={(open) =>
          setPerformanceModal((current) => ({ ...current, open }))
        }
        onSubmit={(values) => {
          if (performanceModal.editing) {
            updatePerformance.mutate(
              { id: performanceModal.editing.id, input: values },
              {
                onSuccess: () =>
                  setPerformanceModal({ open: false, editing: null }),
              },
            );
          } else {
            createPerformance.mutate(values as CreatePerformanceReviewInput, {
              onSuccess: () =>
                setPerformanceModal({ open: false, editing: null }),
            });
          }
        }}
        isPending={createPerformance.isPending || updatePerformance.isPending}
        error={createPerformance.error ?? updatePerformance.error ?? null}
      />

      <GoalDialog
        open={goalModal.open}
        editing={goalModal.editing}
        employees={employees}
        defaultEmployeeId={ownEmployee?.id}
        onOpenChange={(open) => setGoalModal((current) => ({ ...current, open }))}
        onSubmit={(values) => {
          if (goalModal.editing) {
            updateGoal.mutate(
              { id: goalModal.editing.id, input: values },
              { onSuccess: () => setGoalModal({ open: false, editing: null }) },
            );
          } else {
            createGoal.mutate(values as CreateEmployeeGoalInput, {
              onSuccess: () => setGoalModal({ open: false, editing: null }),
            });
          }
        }}
        isPending={createGoal.isPending || updateGoal.isPending}
        error={createGoal.error ?? updateGoal.error ?? null}
      />
    </div>
  );
}

function OverviewPanel({
  stats,
  isLoading,
  isError,
  error,
  onRetry,
  productivityChart,
  pendingLeaves,
  canManage,
  onReviewLeave,
}: {
  stats: ReturnType<typeof useTeamStatistics>["data"];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  productivityChart: Array<{ label: string; value: number }>;
  pendingLeaves: LeaveRequest[];
  canManage: boolean;
  onReviewLeave: (leave: LeaveRequest) => void;
}) {
  if (isLoading && !stats) {
    return <LoadingState label="Loading team statistics" />;
  }
  if (isError && !stats) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load team statistics."
        }
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-6" aria-busy={isLoading}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total employees"
          value={stats?.totalEmployees ?? "—"}
          icon={Users}
        />
        <StatCard
          label="Present today"
          value={stats?.presentToday ?? "—"}
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending leave"
          value={stats?.pendingLeaves ?? "—"}
          icon={CalendarClock}
        />
        <StatCard
          label="Avg productivity"
          value={
            stats?.averageProductivity != null
              ? `${Math.round(stats.averageProductivity)}%`
              : "—"
          }
          icon={Target}
        />
        <StatCard
          label="Departments"
          value={stats?.departments ?? "—"}
          icon={Building2}
        />
        <StatCard
          label="Admins"
          value={stats?.admins ?? "—"}
          icon={Shield}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Workforce snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Active", value: stats?.activeEmployees },
              { label: "Inactive", value: stats?.inactiveEmployees },
              { label: "Departments", value: stats?.departments },
              { label: "Teams", value: stats?.teams },
              { label: "Late today", value: stats?.lateToday },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/50 p-3"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{item.value ?? "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Productivity scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productivityChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No performance reviews yet.
              </p>
            ) : (
              productivityChart.map((item) => (
                <ProductivityBar
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && pendingLeaves.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Pending leave approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeaves.slice(0, 5).map((leave) => (
              <div
                key={leave.id}
                className="flex flex-col gap-2 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {formatEmployeeName(leave.employee)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {LEAVE_TYPE_LABELS[leave.type]} · {formatDate(leave.startDate)}{" "}
                    – {formatDate(leave.endDate)} ({leave.days} days)
                  </p>
                </div>
                <Button size="sm" onClick={() => onReviewLeave(leave)}>
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}



function AttendancePanel({
  records,
  isLoading,
  isError,
  error,
  onRetry,
  canManage,
  todayRecord,
  onCheckIn,
  onCheckOut,
  checkInPending,
  checkOutPending,
}: {
  records: Attendance[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  canManage: boolean;
  todayRecord?: Attendance;
  onCheckIn: () => void;
  onCheckOut: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}) {
  if (isLoading) return <LoadingState label="Loading attendance" />;
  if (isError) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load attendance records."
        }
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!canManage ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Today</p>
              <p className="text-sm text-muted-foreground">
                {todayRecord?.checkInAt
                  ? `Checked in at ${formatDateTime(todayRecord.checkInAt)}`
                  : "Not checked in yet"}
                {todayRecord?.checkOutAt
                  ? ` · Out at ${formatDateTime(todayRecord.checkOutAt)}`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onCheckIn}
                disabled={Boolean(todayRecord?.checkInAt) || checkInPending}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check in
              </Button>
              <Button
                variant="outline"
                onClick={onCheckOut}
                disabled={
                  !todayRecord?.checkInAt ||
                  Boolean(todayRecord?.checkOutAt) ||
                  checkOutPending
                }
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check out
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {records.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No attendance records"
          description="Attendance will appear here once employees check in."
        />
      ) : (
        <Card className="border-border/50">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Check in</th>
                  <th className="px-4 py-3 font-medium">Check out</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      {formatEmployeeName(record.employee)}
                    </td>
                    <td className="px-4 py-3">{formatDate(record.date)}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(record.checkInAt)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(record.checkOutAt)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMinutes(record.workingMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={ATTENDANCE_STATUS_LABELS[record.status]}
                        tone={record.isLate ? "warning" : "success"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeavePanel({
  leaves,
  isLoading,
  isError,
  error,
  onRetry,
  statusFilter,
  onStatusFilterChange,
  canManage,
  onReview,
  onRequestLeave,
}: {
  leaves: LeaveRequest[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  statusFilter: LeaveRequestStatusValue | "ALL";
  onStatusFilterChange: (value: LeaveRequestStatusValue | "ALL") => void;
  canManage: boolean;
  onReview: (leave: LeaveRequest) => void;
  onRequestLeave: () => void;
}) {
  if (isLoading) return <LoadingState label="Loading leave requests" />;
  if (isError) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load leave requests."
        }
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className={cn(selectClassName, "sm:max-w-xs")}
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as LeaveRequestStatusValue | "ALL")
          }
        >
          <option value="ALL">All statuses</option>
          {LEAVE_REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAVE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {leaves.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No leave requests"
          description="Submit a leave request to track time off."
          actionLabel="Request leave"
          onAction={onRequestLeave}
        />
      ) : (
        <Card className="border-border/50">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  {canManage ? (
                    <th className="px-4 py-3 font-medium">Employee</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Workflow</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-border/50">
                    {canManage ? (
                      <td className="px-4 py-3">
                        {formatEmployeeName(leave.employee)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">{LEAVE_TYPE_LABELS[leave.type]}</td>
                    <td className="px-4 py-3">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </td>
                    <td className="px-4 py-3">{leave.days}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={LEAVE_STATUS_LABELS[leave.status]}
                        tone={leaveStatusTone(leave.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {LEAVE_WORKFLOW_STAGE_LABELS[
                        leave.workflowState ??
                          (leave.status === "APPROVED"
                            ? "FINAL_APPROVED"
                            : leave.status === "REJECTED"
                              ? "FINAL_REJECTED"
                              : leave.status === "CANCELLED"
                                ? "CANCELLED"
                                : "SUBMITTED")
                      ]}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && leave.status === "PENDING" ? (
                        <Button size="sm" onClick={() => onReview(leave)}>
                          Review
                        </Button>
                      ) : canManage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReview(leave)}
                        >
                          View stages
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PerformancePanel({
  reviews,
  goals,
  isLoading,
  isError,
  error,
  onRetry,
  canManage,
  isSuperAdmin,
  onEditReview,
  onAddReview,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
}: {
  reviews: PerformanceReview[];
  goals: EmployeeGoal[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  canManage: boolean;
  isSuperAdmin: boolean;
  onEditReview: (review: PerformanceReview) => void;
  onAddReview: () => void;
  onAddGoal: () => void;
  onEditGoal: (goal: EmployeeGoal) => void;
  onDeleteGoal: (id: string) => void;
}) {
  if (isLoading) return <LoadingState label="Loading performance data" />;
  if (isError) {
    return (
      <ErrorState
        description={
          error instanceof ApiClientError
            ? error.message
            : "Could not load performance data."
        }
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PerformanceLiveDashboard
        canManage={canManage}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Performance reviews</CardTitle>
          {canManage ? (
            <Button size="sm" variant="outline" onClick={onAddReview}>
              Add manual note
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {canManage
                        ? formatEmployeeName(review.employee)
                        : review.periodLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {review.periodLabel} ·{" "}
                      {PERFORMANCE_RATING_LABELS[review.rating]}
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditReview(review)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3">
                  <ProductivityBar
                    label="Productivity"
                    value={review.productivityScore}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Goals & KPIs</CardTitle>
          {canManage ? (
            <Button size="sm" variant="outline" onClick={onAddGoal}>
              Add goal
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals tracked yet.</p>
          ) : (
            goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {GOAL_STATUS_LABELS[goal.status]}
                      {goal.dueDate ? ` · Due ${formatDate(goal.dueDate)}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditGoal(goal)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3">
                  <ProductivityBar label="Progress" value={goal.progress} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}


function DepartmentDialog({
  open,
  editing,
  employees = [],
  onOpenChange,
  onSubmit,
  isPending,
  error,
  onDelete,
}: {
  open: boolean;
  editing: Department | null;
  employees?: EmployeeProfile[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateDepartmentInput | UpdateDepartmentInput) => void;
  isPending: boolean;
  error: unknown;
  onDelete?: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [headId, setHeadId] = useState("");

  const reset = () => {
    setName(editing?.name ?? "");
    setCode(editing?.code ?? "");
    setDescription(editing?.description ?? "");
    setHeadId(editing?.headId ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit department" : "Add department"}
          </DialogTitle>
          <DialogDescription>
            Organize employees into departments for reporting and access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-code">Code</Label>
            <Input
              id="dept-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-head">Head of department</Label>
            <select
              id="dept-head"
              className={selectClassName}
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
            >
              <option value="">None</option>
              {employees.map((employee) => (
                <option key={employee.userId} value={employee.userId}>
                  {formatEmployeeName(employee)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-desc">Description</Label>
            <Input
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{mutationError(error)}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {editing && onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending || !name.trim() || !code.trim()}
              onClick={() =>
                onSubmit({
                  name: name.trim(),
                  code: code.trim(),
                  description: description.trim() || null,
                  headId: headId || null,
                })
              }
            >
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TeamDialog({
  open,
  editing,
  departments,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  editing: Team | null;
  departments: Department[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTeamInput | UpdateTeamInput) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const reset = () => {
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setDepartmentId(editing?.departmentId ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit team" : "Create team"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-desc">Description</Label>
            <Input
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-dept">Department</Label>
            <select
              id="team-dept"
              className={selectClassName}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">None</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive">{mutationError(error)}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending || !name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || null,
                departmentId: departmentId || null,
              })
            }
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateLeaveRequestInput) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [type, setType] = useState<LeaveTypeValue>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leave-type">Type</Label>
            <select
              id="leave-type"
              className={selectClassName}
              value={type}
              onChange={(e) => setType(e.target.value as LeaveTypeValue)}
            >
              {LEAVE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {LEAVE_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leave-start">Start date</Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">End date</Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Input
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{mutationError(error)}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending || !startDate || !endDate}
            onClick={() =>
              onSubmit({
                type,
                startDate,
                endDate,
                reason: reason.trim() || null,
              })
            }
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveReviewDialog({
  leave,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  leave: LeaveRequest | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: "APPROVED" | "REJECTED", reviewNote: string | null) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const canAct = leave?.status === "PENDING";
  const actionCopy = leave
    ? getLeaveWorkflowActionCopy(leave)
    : { approveLabel: "Approve", rejectLabel: "Reject", stageHint: "" };

  return (
    <Dialog
      open={Boolean(leave)}
      onOpenChange={(open) => {
        if (!open) setReviewNote("");
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {canAct ? "Review leave request" : "Leave workflow"}
          </DialogTitle>
          <DialogDescription>
            {leave
              ? `${formatEmployeeName(leave.employee)} · ${LEAVE_TYPE_LABELS[leave.type]} · ${leave.days} days`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {leave ? <LeaveWorkflowStepper leave={leave} /> : null}

        {canAct ? (
          <p className="text-sm text-muted-foreground">{actionCopy.stageHint}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This leave is no longer pending. Workflow history is shown above.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="review-note">Note (optional)</Label>
          <Input
            id="review-note"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            disabled={!canAct || isPending}
            maxLength={1000}
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error instanceof ApiClientError && error.status === 401
                ? "Sign in required."
                : error instanceof ApiClientError && error.status === 403
                  ? "You do not have permission to review this leave."
                  : mutationError(error)}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          {canAct ? (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  onSubmit("REJECTED", reviewNote.trim() || null)
                }
              >
                {isPending ? "Working…" : actionCopy.rejectLabel}
              </Button>
              <Button
                disabled={isPending}
                onClick={() => onSubmit("APPROVED", reviewNote.trim() || null)}
              >
                {isPending ? "Working…" : actionCopy.approveLabel}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PerformanceDialog({
  open,
  editing,
  employees,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  editing: PerformanceReview | null;
  employees: EmployeeProfile[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: CreatePerformanceReviewInput | UpdatePerformanceReviewInput,
  ) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [productivityScore, setProductivityScore] = useState("70");
  const [rating, setRating] =
    useState<(typeof PERFORMANCE_RATINGS)[number]>("AVERAGE");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setEmployeeId(editing?.employeeId ?? "");
    setPeriodLabel(editing?.periodLabel ?? "");
    setPeriodStart(editing?.periodStart ?? "");
    setPeriodEnd(editing?.periodEnd ?? "");
    setProductivityScore(String(editing?.productivityScore ?? 70));
    setRating(editing?.rating ?? "AVERAGE");
    setNotes(editing?.notes ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit review" : "Add performance review"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="perf-employee">Employee</Label>
              <select
                id="perf-employee"
                className={selectClassName}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {formatEmployeeName(emp)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="perf-period">Period label</Label>
            <Input
              id="perf-period"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="Q1 2026"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perf-start">Period start</Label>
              <Input
                id="perf-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perf-end">Period end</Label>
              <Input
                id="perf-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perf-score">Productivity score</Label>
              <Input
                id="perf-score"
                type="number"
                min={0}
                max={100}
                value={productivityScore}
                onChange={(e) => setProductivityScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perf-rating">Rating</Label>
              <select
                id="perf-rating"
                className={selectClassName}
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value as (typeof PERFORMANCE_RATINGS)[number])
                }
              >
                {PERFORMANCE_RATINGS.map((value) => (
                  <option key={value} value={value}>
                    {PERFORMANCE_RATING_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="perf-notes">Notes</Label>
            <Input
              id="perf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{mutationError(error)}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              !periodLabel.trim() ||
              !periodStart ||
              !periodEnd ||
              (!editing && !employeeId)
            }
            onClick={() => {
              const payload = {
                periodLabel: periodLabel.trim(),
                periodStart,
                periodEnd,
                productivityScore: Number(productivityScore),
                rating,
                notes: notes.trim() || null,
              };
              if (editing) {
                onSubmit(payload);
              } else {
                onSubmit({ ...payload, employeeId });
              }
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({
  open,
  editing,
  employees,
  defaultEmployeeId,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  editing: EmployeeGoal | null;
  employees: EmployeeProfile[];
  defaultEmployeeId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateEmployeeGoalInput | UpdateEmployeeGoalInput) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] =
    useState<(typeof GOAL_STATUSES)[number]>("NOT_STARTED");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setEmployeeId(editing?.employeeId ?? defaultEmployeeId ?? "");
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setProgress(String(editing?.progress ?? 0));
    setStatus(editing?.status ?? "NOT_STARTED");
    setDueDate(editing?.dueDate ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "Add goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="goal-employee">Employee</Label>
              <select
                id="goal-employee"
                className={selectClassName}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {formatEmployeeName(emp)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-desc">Description</Label>
            <Input
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-progress">Progress %</Label>
              <Input
                id="goal-progress"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-status">Status</Label>
              <select
                id="goal-status"
                className={selectClassName}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as (typeof GOAL_STATUSES)[number])
                }
              >
                {GOAL_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {GOAL_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-due">Due date</Label>
            <Input
              id="goal-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{mutationError(error)}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              !title.trim() ||
              (!editing && !employeeId)
            }
            onClick={() => {
              const payload = {
                title: title.trim(),
                description: description.trim() || null,
                progress: Number(progress),
                status,
                dueDate: dueDate || null,
              };
              if (editing) {
                onSubmit(payload);
              } else {
                onSubmit({ ...payload, employeeId });
              }
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
