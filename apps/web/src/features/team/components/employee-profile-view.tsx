"use client";

import {
  DOCUMENT_TYPES,
  type Attendance,
  type Department,
  type DocumentTypeValue,
  type EmployeeDocumentDto,
  type EmployeeGoal,
  type EmployeeProfile,
  type EmployeePromotionDto,
  type EmployeeTimelineEventDto,
  type EmployeeTransferDto,
  type LeaveRequest,
  type PerformanceReview,
  type Team,
} from "@enterprise/shared";
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  Pencil,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import { teamService } from "../services/team.service";
import {
  ATTENDANCE_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  EMPLOYEE_GENDER_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GOAL_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  MARITAL_STATUS_LABELS,
  PERFORMANCE_RATING_LABELS,
  WORK_SHIFT_LABELS,
  formatCreatedBy,
  formatDate,
  formatDateTime,
  formatEmployeeName,
  formatMinutes,
} from "../types/team.types";
import {
  EmployeeAvatar,
  employeeStatusTone,
  selectClassName,
  StatusPill,
} from "./team-shared";

type ProfileTab =
  | "overview"
  | "attendance"
  | "leaves"
  | "performance"
  | "documents"
  | "timeline"
  | "career"
  | "permissions"
  | "security"
  | "activity"
  | "id-card";

const EMPLOYEE_PROFILE_TABS: readonly ProfileTab[] = [
  "overview",
  "attendance",
  "leaves",
  "performance",
  "documents",
  "timeline",
  "career",
  "id-card",
];

const ADMIN_PROFILE_TABS: readonly ProfileTab[] = [
  "overview",
  "attendance",
  "leaves",
  "performance",
  "documents",
  "timeline",
  "career",
  "permissions",
  "security",
  "activity",
  "id-card",
];

function profileTabLabel(tab: ProfileTab): string {
  switch (tab) {
    case "overview":
      return "Personal";
    case "attendance":
      return "Attendance";
    case "leaves":
      return "Leave";
    case "performance":
      return "Performance";
    case "documents":
      return "Documents";
    case "timeline":
      return "Timeline";
    case "career":
      return "Career";
    case "permissions":
      return "Permissions";
    case "security":
      return "Security";
    case "activity":
      return "Activity Log";
    case "id-card":
      return "ID Card";
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

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

function openPrintWindow(html: string, title: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
}

function countLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate.includes("T") ? startDate : `${startDate}T00:00:00`);
  const end = new Date(endDate.includes("T") ? endDate : `${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export function EmployeeProfileView({
  employee,
  isLoading,
  canManage,
  canManageOrg = false,
  attendance = [],
  leaves = [],
  reviews = [],
  goals = [],
  departments = [],
  teams = [],
  onBack,
  onEdit,
}: {
  employee?: EmployeeProfile;
  isLoading: boolean;
  canManage: boolean;
  canManageOrg?: boolean;
  attendance?: Attendance[];
  leaves?: LeaveRequest[];
  reviews?: PerformanceReview[];
  goals?: EmployeeGoal[];
  departments?: Department[];
  teams?: Team[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const isAdminProfile = Boolean(employee?.adminCode);
  const profileTabs = isAdminProfile ? ADMIN_PROFILE_TABS : EMPLOYEE_PROFILE_TABS;
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
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

  const displayName = formatEmployeeName(employee);
  const photoUrl = employee?.photoUrl ?? employee?.user?.avatarUrl;
  const email =
    employee?.companyEmail ?? employee?.user?.email ?? employee?.personalEmail ?? "—";

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
    return { present, absent, late, workingMinutes, total: attendance.length };
  }, [attendance]);

  const leavesTaken = useMemo(
    () =>
      leaves
        .filter((leave) => leave.status === "APPROVED")
        .reduce((sum, leave) => sum + countLeaveDays(leave.startDate, leave.endDate), 0),
    [leaves],
  );

  const performanceAvg = useMemo(() => {
    if (reviews.length === 0) return null;
    const avg =
      reviews.reduce((sum, review) => sum + review.productivityScore, 0) / reviews.length;
    return Math.round(avg);
  }, [reviews]);

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
    if (!employee?.id) return;
    void loadHrData(employee.id);
  }, [employee?.id, loadHrData]);

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

  const handleExportProfile = () => {
    if (!employee) return;
    const lines = [
      `Employee Profile: ${displayName}`,
      `Code: ${employee.employeeCode}`,
      employee.adminCode ? `Admin Code: ${employee.adminCode}` : "",
      `Designation: ${employee.designation ?? "—"}`,
      `Department: ${employee.department?.name ?? "—"}`,
      `Team: ${employee.primaryTeam?.name ?? "—"}`,
      `Email: ${email}`,
      `Phone: ${employee.phone ?? "—"}`,
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${employee.employeeCode}-profile.txt`;
    link.click();
    URL.revokeObjectURL(url);
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

  const recentTimeline = timeline.slice(0, 6);
  const roleLabel =
    employee?.user?.roleName ?? employee?.user?.roleCode ?? "Employee";

  if (isLoading) {
    return <LoadingState label="Loading employee profile" />;
  }

  if (!employee) {
    return (
      <ErrorState
        description="Employee profile could not be loaded."
        onRetry={onBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Employee Profile</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handlePrintIdCard()}>
                <CreditCard className="mr-2 h-4 w-4" />
                Generate ID Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportProfile}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage ? (
            <Button size="sm" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : null}
        </div>
      </div>

      {/* Hero summary card */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-6">
          <div className="grid gap-8 lg:grid-cols-[auto_1fr_1fr] xl:grid-cols-3">
            {/* Left column */}
            <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full object-cover ring-2 ring-border/60"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary ring-2 ring-border/60">
                  {displayName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("") || "?"}
                </div>
              )}
              <StatusPill
                label={EMPLOYEE_STATUS_LABELS[employee.status]}
                tone={employeeStatusTone(employee.status)}
              />
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {employee.designation ?? "No designation"}
                </p>
                <p className="mt-1 font-mono text-sm text-primary">
                  {employee.employeeCode}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <StatusPill label={roleLabel} tone="default" />
                  {employee.adminCode ? (
                    <StatusPill label={employee.adminCode} tone="default" />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Middle column */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <InfoField label="Department" value={employee.department?.name ?? "—"} />
              <InfoField label="Team" value={employee.primaryTeam?.name ?? "—"} />
              <InfoField
                label="Reporting Manager"
                value={
                  employee.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : "—"
                }
              />
              <InfoField label="Email" value={email} />
              <InfoField label="Phone" value={employee.phone ?? "—"} />
              <InfoField label="Work Location" value={employee.workLocation ?? "—"} />
            </div>

            {/* Right column */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <InfoField label="Employee Since" value={formatDate(employee.hireDate)} />
              <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
              <InfoField label="CNIC" value={employee.nationalId ?? "—"} />
              <InfoField
                label="Employment Type"
                value={
                  employee.employmentType
                    ? EMPLOYMENT_TYPE_LABELS[employee.employmentType]
                    : "—"
                }
              />
              <InfoField
                label="Work Shift"
                value={employee.shift ? WORK_SHIFT_LABELS[employee.shift] : "—"}
              />
              <InfoField label="Badge Number" value={employee.badgeNumber ?? "—"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border/50">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {profileTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {profileTabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {hrDataError ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
          role="alert"
        >
          <p className="flex-1 text-sm text-destructive">{hrDataError}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (employee) void loadHrData(employee.id);
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {hrDataLoading &&
      (activeTab === "documents" ||
        activeTab === "timeline" ||
        activeTab === "career") ? (
        <LoadingState label="Loading HR data" />
      ) : null}

      {/* Overview tab */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <InfoField label="Father's Name" value={employee.fatherName ?? "—"} />
                <InfoField
                  label="Marital Status"
                  value={
                    employee.maritalStatus
                      ? MARITAL_STATUS_LABELS[employee.maritalStatus]
                      : "—"
                  }
                />
                <InfoField label="Blood Group" value={employee.bloodGroup ?? "—"} />
                <InfoField
                  label="Gender"
                  value={
                    employee.gender ? EMPLOYEE_GENDER_LABELS[employee.gender] : "—"
                  }
                />
                <InfoField label="Nationality" value={employee.country ?? "—"} />
                <InfoField label="Address" value={employee.address ?? "—"} />
                <InfoField label="City" value={employee.city ?? "—"} />
                {employee.skills.length > 0 ? (
                  <InfoField label="Languages / Skills" value={employee.skills.join(", ")} />
                ) : employee.bio ? (
                  <InfoField label="Bio" value={employee.bio} />
                ) : null}
                {employee.notes ? (
                  <InfoField label="Notes" value={employee.notes} />
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <InfoField
                  label="Name"
                  value={employee.emergencyContactName ?? "—"}
                />
                <InfoField
                  label="Phone"
                  value={employee.emergencyContactPhone ?? "—"}
                />
                <InfoField
                  label="Relation"
                  value={employee.emergencyContactRelation ?? "—"}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reporting Manager</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.manager ? (
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar
                      name={`${employee.manager.firstName} ${employee.manager.lastName}`}
                      photoUrl={employee.manager.avatarUrl}
                    />
                    <div>
                      <p className="font-medium">
                        {employee.manager.firstName} {employee.manager.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.manager.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No manager assigned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Attendance this month"
              value={`${attendanceSummary.present}/${attendanceSummary.total || 0}`}
            />
            <KpiCard label="Leaves taken" value={String(leavesTaken)} />
            <KpiCard
              label="Performance avg"
              value={performanceAvg != null ? `${performanceAvg}%` : "—"}
            />
            <KpiCard
              label="Experience"
              value={
                employee.experienceYears != null
                  ? `${employee.experienceYears} yrs`
                  : "—"
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  recentTimeline.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border/50 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.eventType} · {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {email !== "—" ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handlePrintIdCard()}
                  disabled={idCardLoading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Generate ID Card
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("leaves")}>
                  Add Leave
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("performance")}
                >
                  Add Performance
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("timeline")}>
                  View Timeline
                </Button>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Security</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <InfoField label="Must change password" value="N/A" />
              <InfoField label="Password last changed" value="—" />
              <InfoField label="Two-factor authentication" value="Managed in Security" />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Attendance tab */}
      {activeTab === "attendance" ? (
        <div className="space-y-3 text-sm">
          {attendance.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-card p-4 sm:grid-cols-4">
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
            <EmptyState title="No attendance records" description="No records for this period." />
          ) : (
            attendance.slice(0, 20).map((record) => (
              <div
                key={record.id}
                className="flex justify-between rounded-lg border border-border/50 bg-card px-3 py-2"
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

      {/* Leaves tab */}
      {activeTab === "leaves" ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Annual</p>
              <p className="font-semibold">{employee.annualLeaveBalance}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Casual</p>
              <p className="font-semibold">{employee.casualLeaveBalance ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Medical</p>
              <p className="font-semibold">
                {employee.medicalLeaveBalance ?? employee.sickLeaveBalance}
              </p>
            </div>
          </div>
          {leaves.length === 0 ? (
            <EmptyState title="No leave requests" description="No leave history yet." />
          ) : (
            leaves.slice(0, 20).map((leave) => (
              <div
                key={leave.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                {LEAVE_TYPE_LABELS[leave.type]} · {LEAVE_STATUS_LABELS[leave.status]} ·{" "}
                {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Performance tab */}
      {activeTab === "performance" ? (
        <div className="space-y-4 text-sm">
          {reviews[0] ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/50 bg-card px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current score
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {reviews[0].autoScore ?? reviews[0].productivityScore}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-card px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Source
                </p>
                <p className="mt-1 font-medium">
                  {reviews[0].source ?? "MANUAL"}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-card px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rating
                </p>
                <p className="mt-1 font-medium">
                  {PERFORMANCE_RATING_LABELS[reviews[0].rating]}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-card px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Goals avg
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {goals.length
                    ? Math.round(
                        goals.reduce((a, g) => a + g.progress, 0) / goals.length,
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          ) : null}

          {reviews[0]?.insights?.length ? (
            <div className="space-y-2">
              <p className="font-medium">AI insights</p>
              {reviews[0].insights.slice(0, 6).map((insight, idx) => (
                <div
                  key={`${insight.message}-${idx}`}
                  className="rounded-lg border border-border/50 bg-card px-3 py-2"
                >
                  {insight.message}
                </div>
              ))}
            </div>
          ) : null}

          {reviews[0]?.componentScores?.length ? (
            <div className="space-y-2">
              <p className="font-medium">Score breakdown</p>
              <div className="grid gap-2 md:grid-cols-2">
                {reviews[0].componentScores.map((c) => (
                  <div
                    key={c.key}
                    className="rounded-lg border border-border/50 bg-card px-3 py-2"
                  >
                    <div className="flex justify-between">
                      <span>{c.label}</span>
                      <span className="font-medium">{c.score}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Weight {c.weight}% · Enabled {c.enabled ? "yes" : "no"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="font-medium">Monthly / period reviews</p>
            {reviews.slice(0, 10).map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                {review.periodLabel} · {PERFORMANCE_RATING_LABELS[review.rating]}{" "}
                · {review.autoScore ?? review.productivityScore}%
                {review.managerComment ? ` · ${review.managerComment}` : ""}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-medium">Goals & KPIs</p>
            {goals.slice(0, 10).map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                {goal.title} · {GOAL_STATUS_LABELS[goal.status]} · {goal.progress}
                %
                {goal.autoProgress ? " · auto" : ""}
              </div>
            ))}
          </div>

          {reviews.length === 0 && goals.length === 0 ? (
            <EmptyState
              title="No performance data"
              description="Live scores appear after the performance engine recalculates activity."
            />
          ) : null}
        </div>
      ) : null}

      {/* Documents tab */}
      {activeTab === "documents" ? (
        <div className="space-y-3 text-sm">
          {canManage ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-card p-4">
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
                onChange={(e) => setDocType(e.target.value as DocumentTypeValue)}
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
            <EmptyState title="No documents" description="No documents linked yet." />
          ) : (
            documents.map((doc) => {
              const mime = doc.mimeType ?? inferMimeFromUrl(doc.fileUrl);
              return (
                <div
                  key={doc.id}
                  className="space-y-2 rounded-lg border border-border/50 bg-card px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.type]} · {formatDateTime(doc.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        aria-label={`Open ${doc.title}`}
                      >
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">
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
                      className="max-h-40 w-full rounded-md bg-muted/40 object-contain"
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

      {/* Timeline tab */}
      {activeTab === "timeline" ? (
        <div className="space-y-2 text-sm">
          {timeline.length === 0 ? (
            <EmptyState title="No timeline events" description="Events will appear here." />
          ) : (
            timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.eventType} · {formatDateTime(event.createdAt)}
                </p>
                {event.description ? (
                  <p className="mt-1 text-muted-foreground">{event.description}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Career tab */}
      {activeTab === "career" ? (
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
            <div className="space-y-2 rounded-lg border border-border/50 bg-card p-4">
              <Label>Effective date</Label>
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
                  careerSaving || !promotionDate || !promotionDesignation.trim()
                }
                onClick={() => void handleCreatePromotion()}
              >
                Save promotion
              </Button>
            </div>
          ) : null}
          {transferFormOpen && canManage ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-card p-4">
              <Label>Effective date</Label>
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
                  className="mb-2 rounded-lg border border-border/50 bg-card px-3 py-2"
                >
                  {formatDate(promotion.effectiveDate)} · {promotion.oldDesignation ?? "—"} →{" "}
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
                  className="mb-2 rounded-lg border border-border/50 bg-card px-3 py-2"
                >
                  {formatDate(transfer.effectiveDate)}
                  {transfer.reason ? ` · ${transfer.reason}` : ""}
                </div>
              ))
            )}
          </div>
          {employee.createdBy ? (
            <p className="text-xs text-muted-foreground">
              Profile created by {formatCreatedBy(employee.createdBy)} on{" "}
              {formatDateTime(employee.createdAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Admin-only tabs */}
      {activeTab === "permissions" && isAdminProfile ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoField label="Role" value="Admin" />
            <InfoField
              label="Permission preset"
              value={
                employee.notes?.match(/Permission preset:\s*(\w+)/i)?.[1] ??
                "FULL"
              }
            />
            <p className="text-muted-foreground">
              Admins inherit the platform Admin role permissions. Super Admins
              can adjust access via Security Center and role configuration.
            </p>
            {canManageOrg ? (
              <p className="text-xs text-muted-foreground">
                Use Edit Admin to update the assigned permission group preset.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "security" && isAdminProfile ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoField
              label="Login email"
              value={employee.user?.email ?? "—"}
            />
            <InfoField
              label="Company email"
              value={employee.companyEmail ?? "—"}
            />
            <InfoField
              label="Account status"
              value={EMPLOYEE_STATUS_LABELS[employee.status]}
            />
            <InfoField
              label="QR token"
              value={employee.qrToken ?? "—"}
            />
            <InfoField
              label="Badge number"
              value={employee.badgeNumber ?? "—"}
            />
            <p className="text-muted-foreground">
              Password resets and forced password-change are managed by Super
              Admin from the Admins directory.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "activity" && isAdminProfile ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoField
              label="Profile created"
              value={formatDateTime(employee.createdAt)}
            />
            <InfoField
              label="Last updated"
              value={formatDateTime(employee.updatedAt)}
            />
            <InfoField
              label="Created by"
              value={formatCreatedBy(employee.createdBy)}
            />
            <p className="text-muted-foreground">
              Detailed audit events for admin create, credential reset, and
              profile updates are recorded in the platform audit log.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ID Card tab */}
      {activeTab === "id-card" ? (
        <Card className="border-border/50">
          <CardContent className="space-y-4 p-6 text-sm">
            <p className="text-muted-foreground">
              Generate a printable employee ID card with front and back layouts.
            </p>
            <Button onClick={() => void handlePrintIdCard()} disabled={idCardLoading}>
              <CreditCard className="mr-2 h-4 w-4" />
              {idCardLoading ? "Generating…" : "Print ID Card"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
