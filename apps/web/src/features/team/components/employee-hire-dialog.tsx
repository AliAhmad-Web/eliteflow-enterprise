"use client";

import {
  EMPLOYEE_GENDERS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  MARITAL_STATUSES,
  WORK_SHIFTS,
  hireEmployeeSchema,
  type Department,
  type EmployeeProfile,
  type EmployeeStatusValue,
  type EmploymentTypeValue,
  type HireEmployeeInput,
  type HireEmployeeResult,
  type MaritalStatusValue,
  type Team,
  type UpdateEmployeeProfileInput,
  type WorkShiftValue,
} from "@enterprise/shared";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  IdCard,
  Info,
  KeyRound,
  Lightbulb,
  ListChecks,
  Mail,
  Pencil,
  QrCode,
  Save,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  EMPLOYEE_GENDER_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  formatEmployeeName,
  todayDateOnly,
} from "../types/team.types";
import { EmployeeAvatar, mutationError, selectClassName } from "./team-shared";
import {
  useWizardLeaveGuard,
  WizardBackButton,
  WizardLeaveConfirmDialog,
} from "./team-wizard-shell";

/** Larger enterprise form controls — UI only. */
const hireSelectClassName = cn(
  selectClassName,
  "h-11 px-3.5 text-[15px] leading-none",
);

function HireInput({ className, ...props }: InputProps) {
  return (
    <Input className={cn("h-11 px-3.5 text-[15px]", className)} {...props} />
  );
}

const formGridClassName = "grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2";

const WIZARD_STEPS = [
  { id: 1, title: "Basic Information", short: "Basic" },
  { id: 2, title: "Contact Information", short: "Contact" },
  { id: 3, title: "Employment Details", short: "Employment" },
  { id: 4, title: "Security & Account", short: "Security" },
  { id: 5, title: "Review & Finish", short: "Review" },
] as const;

const MARITAL_STATUS_LABELS: Record<MaritalStatusValue, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

const WORK_SHIFT_LABELS: Record<WorkShiftValue, string> = {
  MORNING: "Morning",
  EVENING: "Evening",
  NIGHT: "Night",
  FLEXIBLE: "Flexible",
  REMOTE: "Remote",
};

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

const LANGUAGE_OPTIONS = [
  "Urdu",
  "English",
  "Punjabi",
  "Sindhi",
  "Pashto",
  "Balochi",
  "Arabic",
  "Other",
] as const;

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const DRAFT_STORAGE_KEY = "eliteflow.team.hire-draft.v1";

type FieldErrors = Partial<Record<keyof HireFormState | "form", string>>;

type HireFormState = {
  firstName: string;
  lastName: string;
  fatherName: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  religion: string;
  languages: string[];
  email: string;
  personalEmail: string;
  companyEmail: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  address: string;
  city: string;
  province: string;
  country: string;
  hireDate: string;
  departmentId: string;
  primaryTeamId: string;
  designation: string;
  employmentType: EmploymentTypeValue;
  managerId: string;
  workLocation: string;
  shift: string;
  salary: string;
  status: EmployeeStatusValue;
  notes: string;
  photoUrl: string;
};

const emptyHireForm = (): HireFormState => ({
  firstName: "",
  lastName: "",
  fatherName: "",
  gender: "",
  dateOfBirth: "",
  nationalId: "",
  maritalStatus: "",
  bloodGroup: "",
  nationality: "",
  religion: "",
  languages: [],
  email: "",
  personalEmail: "",
  companyEmail: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  address: "",
  city: "",
  province: "",
  country: "",
  hireDate: todayDateOnly(),
  departmentId: "",
  primaryTeamId: "",
  designation: "",
  employmentType: "FULL_TIME",
  managerId: "",
  workLocation: "",
  shift: "",
  salary: "",
  status: "ACTIVE",
  notes: "",
  photoUrl: "",
});

function isValidEmail(value: string): boolean {
  return hireEmployeeSchema.shape.email.safeParse(value.trim()).success;
}

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function companyEmailHint(firstName: string, lastName: string): string {
  const first = firstName.trim().toLowerCase().replace(/\s+/g, "");
  const last = lastName.trim().toLowerCase().replace(/\s+/g, "");
  if (!first && !last) return "firstname.lastname@company.com";
  if (!last) return `${first}@company.com`;
  return `${first}.${last}@company.com`;
}

/** Persist design-only HR meta without schema changes (round-trips via bio). */
function encodeHrMeta(form: HireFormState): string | null {
  const lines: string[] = [];
  if (form.nationality.trim()) {
    lines.push(`Nationality: ${form.nationality.trim()}`);
  }
  if (form.religion.trim()) {
    lines.push(`Religion: ${form.religion.trim()}`);
  }
  if (form.province.trim()) {
    lines.push(`Province: ${form.province.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

function decodeHrMeta(bio: string | null | undefined): {
  nationality: string;
  religion: string;
  province: string;
} {
  const result = { nationality: "", religion: "", province: "" };
  if (!bio) return result;
  for (const line of bio.split("\n")) {
    const nationality = line.match(/^Nationality:\s*(.+)$/i)?.[1];
    const religion = line.match(/^Religion:\s*(.+)$/i)?.[1];
    const province = line.match(/^Province:\s*(.+)$/i)?.[1];
    if (nationality) result.nationality = nationality.trim();
    if (religion) result.religion = religion.trim();
    if (province) result.province = province.trim();
  }
  return result;
}

function formFromEmployee(editing: EmployeeProfile): HireFormState {
  const meta = decodeHrMeta(editing.bio);
  return {
    firstName: editing.user?.firstName ?? "",
    lastName: editing.user?.lastName ?? "",
    fatherName: editing.fatherName ?? "",
    gender: editing.gender ?? "",
    dateOfBirth: editing.dateOfBirth ?? "",
    nationalId: editing.nationalId ?? "",
    maritalStatus: editing.maritalStatus ?? "",
    bloodGroup: editing.bloodGroup ?? "",
    nationality: meta.nationality,
    religion: meta.religion,
    languages: editing.skills ?? [],
    email: editing.user?.email ?? "",
    personalEmail: editing.personalEmail ?? "",
    companyEmail: editing.companyEmail ?? "",
    phone: editing.phone ?? "",
    emergencyContactName: editing.emergencyContactName ?? "",
    emergencyContactPhone: editing.emergencyContactPhone ?? "",
    emergencyContactRelation: editing.emergencyContactRelation ?? "",
    address: editing.address ?? "",
    city: editing.city ?? "",
    province: meta.province,
    country: editing.country ?? "",
    hireDate: editing.hireDate ?? todayDateOnly(),
    departmentId: editing.departmentId ?? "",
    primaryTeamId: editing.primaryTeamId ?? "",
    designation: editing.designation ?? "",
    employmentType: editing.employmentType ?? "FULL_TIME",
    managerId: editing.managerId ?? "",
    workLocation: editing.workLocation ?? "",
    shift: editing.shift ?? "",
    salary: editing.salary != null ? String(editing.salary) : "",
    status: editing.status,
    notes: editing.notes ?? "",
    photoUrl: editing.photoUrl ?? editing.user?.avatarUrl ?? "",
  };
}

export function EmployeeHireDialog({
  open,
  editing,
  departments,
  teams,
  managers,
  onOpenChange,
  onHire,
  onUpdate,
  isPending,
  error,
  hireResult,
  onClearResult,
}: {
  open: boolean;
  editing: EmployeeProfile | null;
  departments: Department[];
  teams: Team[];
  managers: EmployeeProfile[];
  onOpenChange: (open: boolean) => void;
  onHire: (values: HireEmployeeInput) => void;
  onUpdate: (values: UpdateEmployeeProfileInput) => void;
  isPending: boolean;
  error: unknown;
  hireResult?: HireEmployeeResult | null;
  onClearResult?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<HireFormState>(emptyHireForm());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [languageInput, setLanguageInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [baselineFormJson, setBaselineFormJson] = useState("");
  const [baselinePhoto, setBaselinePhoto] = useState<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      revokeObjectUrl();
      setPhotoPreview(null);
      setPhotoError(null);
      setFieldErrors({});
      setDraftSavedAt(null);
      setLanguageInput("");
      setHelpOpen(false);
      setBaselineFormJson("");
      setBaselinePhoto(null);
      return;
    }

    setStep(1);
    setFieldErrors({});
    setPhotoError(null);
    setDraftSavedAt(null);
    setLanguageInput("");

    if (editing) {
      const nextForm = formFromEmployee(editing);
      const nextPhoto = editing.photoUrl ?? editing.user?.avatarUrl ?? null;
      setForm(nextForm);
      setPhotoPreview(nextPhoto);
      setBaselineFormJson(JSON.stringify(nextForm));
      setBaselinePhoto(nextPhoto);
      return;
    }

    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HireFormState;
        const nextForm = { ...emptyHireForm(), ...parsed };
        const nextPhoto = isValidHttpUrl(parsed.photoUrl)
          ? parsed.photoUrl.trim()
          : null;
        setForm(nextForm);
        setPhotoPreview(nextPhoto);
        setBaselineFormJson(JSON.stringify(nextForm));
        setBaselinePhoto(nextPhoto);
        return;
      }
    } catch {
      // ignore corrupt draft
    }

    const nextForm = emptyHireForm();
    setForm(nextForm);
    setPhotoPreview(null);
    setBaselineFormJson(JSON.stringify(nextForm));
    setBaselinePhoto(null);
  }, [open, editing, revokeObjectUrl]);

  useEffect(() => {
    if (hireResult && !editing) {
      setStep(5);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [hireResult, editing]);

  useEffect(() => {
    return () => revokeObjectUrl();
  }, [revokeObjectUrl]);

  const set =
    (key: keyof HireFormState) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

  const suggestedCompanyEmail = useMemo(
    () => companyEmailHint(form.firstName, form.lastName),
    [form.firstName, form.lastName],
  );

  const displayPhoto =
    photoPreview ||
    (isValidHttpUrl(form.photoUrl) ? form.photoUrl.trim() : null);

  const filteredTeams = useMemo(() => {
    if (!form.departmentId) return teams;
    return teams.filter(
      (team) => !team.departmentId || team.departmentId === form.departmentId,
    );
  }, [teams, form.departmentId]);

  const departmentName =
    departments.find((d) => d.id === form.departmentId)?.name ?? "—";
  const selectedManager = managers.find((m) => m.userId === form.managerId);
  const managerName = selectedManager
    ? formatEmployeeName(selectedManager)
    : "—";

  const buildHirePayload = (): HireEmployeeInput => {
    const photo = isValidHttpUrl(form.photoUrl) ? form.photoUrl.trim() : null;
    const bio = encodeHrMeta(form);

    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      nationalId: form.nationalId.trim() || null,
      gender: form.gender
        ? (form.gender as HireEmployeeInput["gender"])
        : null,
      dateOfBirth: form.dateOfBirth || null,
      hireDate: form.hireDate || null,
      departmentId: form.departmentId,
      primaryTeamId: form.primaryTeamId || null,
      designation: form.designation.trim() || null,
      employmentType: form.employmentType,
      managerId: form.managerId || null,
      workLocation: form.workLocation.trim() || null,
      salary: form.salary ? Number(form.salary) : null,
      status: form.status,
      emergencyContactName: form.emergencyContactName.trim() || null,
      emergencyContactPhone: form.emergencyContactPhone.trim() || null,
      emergencyContactRelation: form.emergencyContactRelation.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      photoUrl: photo,
      fatherName: form.fatherName.trim() || null,
      maritalStatus: form.maritalStatus
        ? (form.maritalStatus as HireEmployeeInput["maritalStatus"])
        : null,
      bloodGroup: form.bloodGroup.trim() || null,
      personalEmail: form.personalEmail.trim() || null,
      companyEmail: form.companyEmail.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      shift: form.shift ? (form.shift as HireEmployeeInput["shift"]) : null,
      skills: form.languages,
      documentUrls: [],
      annualLeaveBalance: 20,
      sickLeaveBalance: 10,
      casualLeaveBalance: 10,
      medicalLeaveBalance: 15,
      lifecycleStage: "HIRING",
      bio,
    };
  };

  const buildUpdatePayload = (): UpdateEmployeeProfileInput => {
    const hirePayload = buildHirePayload();
    const { email: _omitEmail, ...updateFields } = hirePayload;
    void _omitEmail;
    return updateFields;
  };

  const canProceedStep = (currentStep: 1 | 2 | 3 | 4 | 5): boolean => {
    switch (currentStep) {
      case 1:
        return Boolean(form.firstName.trim()) && Boolean(form.lastName.trim());
      case 2:
        return Boolean(form.email.trim()) && isValidEmail(form.email);
      case 3:
        return Boolean(form.departmentId.trim());
      case 4:
      case 5:
        return true;
      default: {
        const _exhaustive: never = currentStep;
        return _exhaustive;
      }
    }
  };

  const getStepHint = (currentStep: 1 | 2 | 3 | 4 | 5): string | null => {
    if (canProceedStep(currentStep)) return null;
    switch (currentStep) {
      case 1:
        return "Enter first and last name to continue.";
      case 2:
        return form.email.trim()
          ? "Enter a valid login email address."
          : "Login email is required.";
      case 3:
        return "Select a department to continue.";
      case 4:
      case 5:
        return null;
      default: {
        const _exhaustive: never = currentStep;
        return _exhaustive;
      }
    }
  };

  const submit = () => {
    if (editing) {
      onUpdate(buildUpdatePayload());
      return;
    }

    const payload = buildHirePayload();
    const parsed = hireEmployeeSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          typeof key === "string" &&
          !nextErrors[key as keyof HireFormState]
        ) {
          nextErrors[key as keyof HireFormState] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      if (nextErrors.firstName || nextErrors.lastName) setStep(1);
      else if (nextErrors.email) setStep(2);
      else if (nextErrors.departmentId) setStep(3);
      return;
    }

    setFieldErrors({});
    onHire(parsed.data);
  };

  const saveDraft = () => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
      setDraftSavedAt(new Date().toLocaleTimeString());
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        form: "Could not save draft in this browser.",
      }));
    }
  };

  const handlePhotoFile = (file: File | null) => {
    revokeObjectUrl();
    setPhotoError(null);
    if (!file) return;

    if (
      !ALLOWED_PHOTO_TYPES.includes(
        file.type as (typeof ALLOWED_PHOTO_TYPES)[number],
      )
    ) {
      setPhotoError("Please choose a JPEG, PNG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Image must be 5 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoPreview(url);
  };

  const removePhoto = () => {
    revokeObjectUrl();
    setPhotoPreview(null);
    setPhotoError(null);
    set("photoUrl")("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = useCallback(() => {
    onClearResult?.();
    revokeObjectUrl();
    onOpenChange(false);
  }, [onClearResult, onOpenChange, revokeObjectUrl]);

  const isSuccess = Boolean(hireResult && !editing && step === 5);

  const isDirty = useMemo(() => {
    if (!open || isSuccess) return false;
    if (JSON.stringify(form) !== baselineFormJson) return true;
    if (photoPreview?.startsWith("blob:")) return true;
    return (photoPreview ?? null) !== baselinePhoto;
  }, [open, isSuccess, form, photoPreview, baselineFormJson, baselinePhoto]);

  const { requestLeave, confirmOpen, stayOnPage, confirmLeave } =
    useWizardLeaveGuard({
      open,
      isDirty,
      allowLeaveWithoutConfirm: isSuccess,
      blockEscape: helpOpen,
      onLeave: handleClose,
    });

  const addLanguage = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setForm((prev) =>
      prev.languages.includes(next)
        ? prev
        : { ...prev, languages: [...prev.languages, next].slice(0, 30) },
    );
    setLanguageInput("");
  };

  const removeLanguage = (value: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.filter((lang) => lang !== value),
    }));
  };

  const goNext = () => {
    if (!canProceedStep(step as 1 | 2 | 3 | 4 | 5)) return;
    setStep((s) => Math.min(5, s + 1));
  };

  if (!open) return null;

  const completedSteps = Math.max(0, step - 1);
  const progressPercent = Math.round((completedSteps / WIZARD_STEPS.length) * 100);

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <WizardBackButton
            onClick={isSuccess ? handleClose : requestLeave}
            disabled={isPending}
          />
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Team / Employees /{" "}
            <span className="text-foreground">
              {editing ? "Edit Employee" : "Add Employee"}
            </span>
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
              {editing
                ? "Edit Employee"
                : isSuccess
                  ? "Employee Registered"
                  : "Add New Employee"}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {editing
                ? "Update the employee profile. Required fields are marked with *."
                : isSuccess
                  ? "Account provisioned successfully. Share credentials securely."
                  : "Create a new employee profile. Required fields are marked with *."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isSuccess ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHelpOpen(true)}
              aria-label="Open hiring help"
            >
              <CircleHelp className="mr-1.5 h-4 w-4" />
              Help
            </Button>
          ) : (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </div>

      {!isSuccess ? (
        <WizardStepper
          currentStep={step}
          progressPercent={progressPercent}
          onStepChange={setStep}
        />
      ) : null}

      <div className="mt-6 pb-5">
        {isSuccess && hireResult ? (
          <SuccessPanel hireResult={hireResult} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(220px,26%)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,24%)_minmax(0,1fr)] 2xl:grid-cols-[minmax(260px,22%)_minmax(0,1fr)]">
            <aside className="order-2 space-y-5 lg:order-1 lg:sticky lg:top-4 lg:self-start">
              <PhotoCard
                displayPhoto={displayPhoto}
                form={form}
                fileInputRef={fileInputRef}
                onPhotoFile={handlePhotoFile}
                onRemovePhoto={removePhoto}
                photoError={photoError}
                onPhotoUrlChange={set("photoUrl")}
              />
              <EmployeeSummaryCard
                form={form}
                editingCode={editing?.employeeCode}
                departmentName={departmentName}
                managerName={managerName}
              />
            </aside>

            <main className="order-1 min-w-0 lg:order-2">
              <div className="space-y-6">
                {step === 1 ? (
                  <SectionCard
                    icon={User}
                    title="Basic Information"
                    description="Personal details about the employee"
                  >
                    <StepBasicInfo
                      form={form}
                      set={set}
                      fieldErrors={fieldErrors}
                      languageInput={languageInput}
                      onLanguageInputChange={setLanguageInput}
                      onAddLanguage={addLanguage}
                      onRemoveLanguage={removeLanguage}
                    />
                  </SectionCard>
                ) : null}

                {step === 2 ? (
                  <SectionCard
                    icon={Mail}
                    title="Contact Information"
                    description="How we reach the employee and emergency contacts"
                  >
                    <StepContact
                      form={form}
                      set={set}
                      editing={Boolean(editing)}
                      suggestedCompanyEmail={suggestedCompanyEmail}
                      fieldErrors={fieldErrors}
                    />
                  </SectionCard>
                ) : null}

                {step === 3 ? (
                  <SectionCard
                    icon={BadgeCheck}
                    title="Employment Details"
                    description="Role, department, and workplace assignment"
                  >
                    <StepEmployment
                      form={form}
                      set={set}
                      editing={Boolean(editing)}
                      editingCode={editing?.employeeCode}
                      departments={departments}
                      teams={filteredTeams}
                      managers={managers}
                      fieldErrors={fieldErrors}
                    />
                  </SectionCard>
                ) : null}

                {step === 4 ? (
                  <SectionCard
                    icon={Shield}
                    title="Security & Account"
                    description="Login credentials and access assets"
                  >
                    <StepSecurity
                      form={form}
                      editing={editing}
                      hireResult={hireResult}
                      suggestedCompanyEmail={suggestedCompanyEmail}
                    />
                  </SectionCard>
                ) : null}

                {step === 5 ? (
                  <SectionCard
                    icon={CheckCircle2}
                    title="Review & Finish"
                    description={
                      editing
                        ? "Confirm changes before saving"
                        : "Confirm details before creating the account"
                    }
                  >
                    <StepFinish
                      form={form}
                      editing={Boolean(editing)}
                      departments={departments}
                      teams={teams}
                      managers={managers}
                    />
                  </SectionCard>
                ) : null}

                {error ? (
                  <p
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {mutationError(error)}
                  </p>
                ) : null}

                {Object.keys(fieldErrors).length > 0 ? (
                  <p
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.form ??
                      "Please fix the highlighted fields before continuing."}
                  </p>
                ) : null}
              </div>

              {/* Actions sit directly under the form — not a detached sticky footer */}
              <div className="mt-5 flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={requestLeave}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Go to previous registration step"
                      onClick={() => setStep((s) => s - 1)}
                      disabled={isPending}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {!editing ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveDraft}
                        disabled={isPending}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Save Draft
                      </Button>
                    ) : null}
                    {step < 5 ? (
                      <Button
                        type="button"
                        aria-label={`Go to step ${step + 1} of 5`}
                        disabled={
                          !canProceedStep(step as 1 | 2 | 3 | 4 | 5) ||
                          isPending
                        }
                        onClick={goNext}
                      >
                        Save & Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        aria-label={
                          editing
                            ? "Save employee changes"
                            : "Create employee account"
                        }
                        disabled={
                          isPending ||
                          !canProceedStep(1) ||
                          !canProceedStep(2) ||
                          !canProceedStep(3)
                        }
                        onClick={submit}
                      >
                        {isPending
                          ? editing
                            ? "Saving…"
                            : "Creating…"
                          : editing
                            ? "Save Changes"
                            : "Finish"}
                      </Button>
                    )}
                  </div>
                  {getStepHint(step as 1 | 2 | 3 | 4 | 5) ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      {getStepHint(step as 1 | 2 | 3 | 4 | 5)}
                    </p>
                  ) : null}
                  {draftSavedAt ? (
                    <p
                      className="text-xs text-emerald-600 dark:text-emerald-400"
                      role="status"
                    >
                      Draft saved at {draftSavedAt}
                    </p>
                  ) : null}
                </div>
              </div>
            </main>
          </div>
        )}
      </div>

      <HelpDrawer open={helpOpen} onOpenChange={setHelpOpen} step={step} />
      <WizardLeaveConfirmDialog
        open={confirmOpen}
        onStay={stayOnPage}
        onLeave={confirmLeave}
      />
    </div>
  );
}

function WizardStepper({
  currentStep,
  progressPercent,
  onStepChange,
}: {
  currentStep: number;
  progressPercent: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Registration steps"
      className="sticky top-0 z-10 rounded-2xl border border-border/50 bg-card/95 px-4 py-5 shadow-[var(--shadow-xs)] backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          Step {currentStep} of {WIZARD_STEPS.length}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {progressPercent}% complete
        </p>
      </div>
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Hiring progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progressPercent, currentStep === 1 ? 8 : progressPercent)}%` }}
        />
      </div>
      <ol className="flex items-start justify-between gap-1 overflow-x-auto">
        {WIZARD_STEPS.map(({ id, title, short }, index) => {
          const active = id === currentStep;
          const completed = id < currentStep;
          return (
            <li
              key={id}
              className="relative flex min-w-[4.5rem] flex-1 flex-col items-center"
            >
              {index < WIZARD_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+1.15rem)] right-[calc(-50%+1.15rem)] top-[1.125rem] h-0.5",
                    completed ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (id <= currentStep) onStepChange(id);
                }}
                disabled={id > currentStep}
                className={cn(
                  "relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                  active &&
                    "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
                  completed &&
                    !active &&
                    "border-primary bg-primary text-primary-foreground",
                  !active &&
                    !completed &&
                    "border-border bg-muted/40 text-muted-foreground",
                  id <= currentStep && "cursor-pointer hover:opacity-90",
                )}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${id}: ${title}${completed ? " (completed)" : ""}`}
              >
                {completed && !active ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  id
                )}
              </button>
              <span
                className={cn(
                  "mt-2.5 text-center text-[11px] font-medium leading-tight sm:text-xs",
                  active
                    ? "text-primary"
                    : completed
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span className="hidden sm:inline">{title}</span>
                <span className="sm:hidden">{short}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-xs)]">
      <header className="flex items-start gap-3.5 border-b border-border/40 px-6 py-5 sm:px-8">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </header>
      <div className="px-6 py-7 sm:px-8 sm:py-8">{children}</div>
    </section>
  );
}

function PhotoCard({
  displayPhoto,
  form,
  fileInputRef,
  onPhotoFile,
  onRemovePhoto,
  photoError,
  onPhotoUrlChange,
}: {
  displayPhoto: string | null;
  form: HireFormState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoFile: (file: File | null) => void;
  onRemovePhoto: () => void;
  photoError: string | null;
  onPhotoUrlChange: (value: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
        Profile Photo
      </h3>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPhotoFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-3 py-7 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5",
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Upload className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-foreground">
          Drag & drop or click to upload
        </span>
        <span className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP · max 5 MB
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPhotoFile(e.target.files?.[0] ?? null)}
      />

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <div className="relative mx-auto w-fit">
          {displayPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPhoto}
              alt="Employee preview"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <EmployeeAvatar
              name={
                `${form.firstName} ${form.lastName}`.trim() || "New employee"
              }
              size="lg"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-sm"
            aria-label="Change photo"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        {displayPhoto ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemovePhoto}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="hire-photo-url" className="text-sm font-medium">
          Photo URL
        </Label>
        <HireInput
          id="hire-photo-url"
          value={form.photoUrl}
          onChange={(e) => onPhotoUrlChange(e.target.value)}
          placeholder="https://…"
        />
      </div>
      {photoError ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {photoError}
        </p>
      ) : null}
    </div>
  );
}

function EmployeeSummaryCard({
  form,
  editingCode,
  departmentName,
  managerName,
}: {
  form: HireFormState;
  editingCode?: string;
  departmentName: string;
  managerName: string;
}) {
  const rows: Array<{ label: string; value: string; accent?: boolean }> = [
    {
      label: "Employee ID",
      value: editingCode ?? "EMP-XXXXX",
      accent: true,
    },
    { label: "Department", value: departmentName },
    { label: "Designation", value: form.designation.trim() || "—" },
    { label: "Reporting Manager", value: managerName },
    {
      label: "Joining Date",
      value: form.hireDate ? formatDate(form.hireDate) : "—",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-1 text-sm font-semibold tracking-tight text-foreground">
        Employee Preview
      </h3>
      <p className="mb-4 text-base font-semibold text-foreground">
        {`${form.firstName} ${form.lastName}`.trim() || "New employee"}
      </p>
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 border-b border-border/30 pb-2.5 last:border-0 last:pb-0"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "max-w-[55%] text-right font-medium text-foreground",
                row.accent &&
                  "rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HelpDrawer({
  open,
  onOpenChange,
  step,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
}) {
  const tips =
    step === 1
      ? [
          "Use a recent, clear profile photo",
          "CNIC should match official records",
          "You can edit any field later from the profile",
        ]
      : step === 2
        ? [
            "Login email creates the system account",
            "Company email can follow the suggested format",
            "Emergency contact is recommended for HR records",
          ]
        : step === 3
          ? [
              "Employee code is generated automatically",
              "Department must be selected to continue",
              "Salary is optional and can be updated later",
            ]
          : step === 4
            ? [
                "Temporary password is shown once after hire",
                "New hires must change password on first login",
                "QR token is used for attendance verification",
              ]
            : [
                "Review every section before finishing",
                "Credentials are emailed when hiring succeeds",
                "ID card becomes available after creation",
              ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(100vw,380px)] gap-0 bg-card p-0 sm:w-[380px]"
      >
        <SheetHeader className="border-b border-border/50 px-6 py-5 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <CircleHelp className="h-4 w-4 text-primary" />
            Hiring help
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Contextual tips for the current step. Hidden by default so the form
            stays focused.
          </p>
        </SheetHeader>
        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              Important
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ensure details are accurate — they are used for official HR
              records, access, and payroll setup.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" />
              Tips for this step
            </div>
            <ul className="space-y-2.5">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ListChecks className="h-4 w-4 text-primary" />
              Required to continue
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">*</span>
                First name and last name (Basic)
              </li>
              <li className="flex gap-2">
                <span className="text-primary">*</span>
                Login email (Contact)
              </li>
              <li className="flex gap-2">
                <span className="text-primary">*</span>
                Department (Employment)
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StepBasicInfo({
  form,
  set,
  fieldErrors,
  languageInput,
  onLanguageInputChange,
  onAddLanguage,
  onRemoveLanguage,
}: {
  form: HireFormState;
  set: (key: keyof HireFormState) => (value: string) => void;
  fieldErrors: FieldErrors;
  languageInput: string;
  onLanguageInputChange: (value: string) => void;
  onAddLanguage: (value: string) => void;
  onRemoveLanguage: (value: string) => void;
}) {
  return (
    <div className={formGridClassName}>
      <Field
        label="First Name"
        htmlFor="hire-first"
        required
        error={fieldErrors.firstName}
      >
        <HireInput
          id="hire-first"
          value={form.firstName}
          onChange={(e) => set("firstName")(e.target.value)}
          autoComplete="given-name"
          error={Boolean(fieldErrors.firstName)}
        />
      </Field>
      <Field
        label="Last Name"
        htmlFor="hire-last"
        required
        error={fieldErrors.lastName}
      >
        <HireInput
          id="hire-last"
          value={form.lastName}
          onChange={(e) => set("lastName")(e.target.value)}
          autoComplete="family-name"
          error={Boolean(fieldErrors.lastName)}
        />
      </Field>
      <Field label="Father Name" htmlFor="hire-father">
        <HireInput
          id="hire-father"
          value={form.fatherName}
          onChange={(e) => set("fatherName")(e.target.value)}
        />
      </Field>
      <Field label="Gender" htmlFor="hire-gender">
        <select
          id="hire-gender"
          className={hireSelectClassName}
          value={form.gender}
          onChange={(e) => set("gender")(e.target.value)}
        >
          <option value="">Select</option>
          {EMPLOYEE_GENDERS.map((g) => (
            <option key={g} value={g}>
              {EMPLOYEE_GENDER_LABELS[g]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date of Birth" htmlFor="hire-dob">
        <HireInput
          id="hire-dob"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set("dateOfBirth")(e.target.value)}
        />
      </Field>
      <Field label="Marital Status" htmlFor="hire-marital">
        <select
          id="hire-marital"
          className={hireSelectClassName}
          value={form.maritalStatus}
          onChange={(e) => set("maritalStatus")(e.target.value)}
        >
          <option value="">Select</option>
          {MARITAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {MARITAL_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="CNIC / National ID"
        htmlFor="hire-cnic"
        hint="Use the official government ID format"
      >
        <HireInput
          id="hire-cnic"
          value={form.nationalId}
          onChange={(e) => set("nationalId")(e.target.value)}
          placeholder="xxxxx-xxxxxxx-x"
        />
      </Field>
      <Field label="Blood Group" htmlFor="hire-blood">
        <select
          id="hire-blood"
          className={hireSelectClassName}
          value={form.bloodGroup}
          onChange={(e) => set("bloodGroup")(e.target.value)}
        >
          <option value="">Select</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nationality" htmlFor="hire-nationality">
        <HireInput
          id="hire-nationality"
          value={form.nationality}
          onChange={(e) => set("nationality")(e.target.value)}
          placeholder="e.g. Pakistani"
        />
      </Field>
      <Field label="Religion" htmlFor="hire-religion">
        <HireInput
          id="hire-religion"
          value={form.religion}
          onChange={(e) => set("religion")(e.target.value)}
        />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="hire-languages" className="text-sm font-medium">
          Languages
        </Label>
        <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 shadow-[var(--shadow-xs)]">
          {form.languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onRemoveLanguage(lang)}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {lang}
              <X className="h-3 w-3" />
            </button>
          ))}
          <HireInput
            id="hire-languages"
            value={languageInput}
            onChange={(e) => onLanguageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onAddLanguage(languageInput.replace(/,/g, ""));
              }
            }}
            list="hire-language-options"
            placeholder="Type and press Enter"
            className="min-w-[160px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <datalist id="hire-language-options">
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

function StepContact({
  form,
  set,
  editing,
  suggestedCompanyEmail,
  fieldErrors,
}: {
  form: HireFormState;
  set: (key: keyof HireFormState) => (value: string) => void;
  editing: boolean;
  suggestedCompanyEmail: string;
  fieldErrors: FieldErrors;
}) {
  return (
    <div className={formGridClassName}>
      <Field label="Phone" htmlFor="hire-phone">
        <HireInput
          id="hire-phone"
          value={form.phone}
          onChange={(e) => set("phone")(e.target.value)}
          placeholder="+92 …"
        />
      </Field>
      <Field label="Personal Email" htmlFor="hire-personal-email">
        <HireInput
          id="hire-personal-email"
          type="email"
          value={form.personalEmail}
          onChange={(e) => set("personalEmail")(e.target.value)}
        />
      </Field>
      <Field
        label="Company Email"
        htmlFor="hire-company-email"
        hint={`Suggested: ${suggestedCompanyEmail}`}
      >
        <HireInput
          id="hire-company-email"
          type="email"
          value={form.companyEmail}
          onChange={(e) => set("companyEmail")(e.target.value)}
          placeholder={suggestedCompanyEmail}
        />
      </Field>
      <Field
        label="Login Email"
        htmlFor="hire-email"
        required
        error={fieldErrors.email}
        hint={editing ? "Login email cannot be changed here" : undefined}
      >
        <HireInput
          id="hire-email"
          type="email"
          value={form.email}
          disabled={editing}
          onChange={(e) => set("email")(e.target.value)}
          error={Boolean(fieldErrors.email)}
        />
      </Field>
      <Field label="Emergency Contact" htmlFor="hire-ec-name">
        <HireInput
          id="hire-ec-name"
          value={form.emergencyContactName}
          onChange={(e) => set("emergencyContactName")(e.target.value)}
          placeholder="Name"
        />
      </Field>
      <Field label="Emergency Phone" htmlFor="hire-ec-phone">
        <HireInput
          id="hire-ec-phone"
          value={form.emergencyContactPhone}
          onChange={(e) => set("emergencyContactPhone")(e.target.value)}
        />
      </Field>
      <Field label="Emergency Relation" htmlFor="hire-ec-rel">
        <HireInput
          id="hire-ec-rel"
          value={form.emergencyContactRelation}
          onChange={(e) => set("emergencyContactRelation")(e.target.value)}
        />
      </Field>
      <Field label="Address" htmlFor="hire-address" className="sm:col-span-2">
        <HireInput
          id="hire-address"
          value={form.address}
          onChange={(e) => set("address")(e.target.value)}
        />
      </Field>
      <Field label="City" htmlFor="hire-city">
        <HireInput
          id="hire-city"
          value={form.city}
          onChange={(e) => set("city")(e.target.value)}
        />
      </Field>
      <Field label="Province" htmlFor="hire-province">
        <HireInput
          id="hire-province"
          value={form.province}
          onChange={(e) => set("province")(e.target.value)}
        />
      </Field>
      <Field label="Country" htmlFor="hire-country">
        <HireInput
          id="hire-country"
          value={form.country}
          onChange={(e) => set("country")(e.target.value)}
        />
      </Field>
    </div>
  );
}

function StepEmployment({
  form,
  set,
  editing,
  editingCode,
  departments,
  teams,
  managers,
  fieldErrors,
}: {
  form: HireFormState;
  set: (key: keyof HireFormState) => (value: string) => void;
  editing: boolean;
  editingCode?: string;
  departments: Department[];
  teams: Team[];
  managers: EmployeeProfile[];
  fieldErrors: FieldErrors;
}) {
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        Employee code is auto-generated on hire (e.g. EMP-00001). You do not
        need to enter it manually.
      </p>
      <div className={formGridClassName}>
        <Field
          label="Employee Code"
          htmlFor="hire-code"
          hint="Assigned automatically on save"
        >
          <HireInput
            id="hire-code"
            value={editingCode ?? "Auto-generated on save"}
            disabled
          />
        </Field>
        <Field
          label="Department"
          htmlFor="hire-dept"
          required
          error={fieldErrors.departmentId}
        >
          <select
            id="hire-dept"
            className={hireSelectClassName}
            value={form.departmentId}
            onChange={(e) => set("departmentId")(e.target.value)}
          >
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team" htmlFor="hire-team">
          <select
            id="hire-team"
            className={hireSelectClassName}
            value={form.primaryTeamId}
            onChange={(e) => set("primaryTeamId")(e.target.value)}
          >
            <option value="">No team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Designation" htmlFor="hire-designation">
          <HireInput
            id="hire-designation"
            value={form.designation}
            onChange={(e) => set("designation")(e.target.value)}
          />
        </Field>
        <Field label="Employment Type" htmlFor="hire-type">
          <select
            id="hire-type"
            className={hireSelectClassName}
            value={form.employmentType}
            onChange={(e) =>
              set("employmentType")(e.target.value as EmploymentTypeValue)
            }
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Manager" htmlFor="hire-manager">
          <select
            id="hire-manager"
            className={hireSelectClassName}
            value={form.managerId}
            onChange={(e) => set("managerId")(e.target.value)}
          >
            <option value="">None</option>
            {managers.map((manager) => (
              <option key={manager.userId} value={manager.userId}>
                {formatEmployeeName(manager)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shift" htmlFor="hire-shift">
          <select
            id="hire-shift"
            className={hireSelectClassName}
            value={form.shift}
            onChange={(e) => set("shift")(e.target.value)}
          >
            <option value="">Select shift</option>
            {WORK_SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {WORK_SHIFT_LABELS[shift]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Joining Date" htmlFor="hire-join">
          <HireInput
            id="hire-join"
            type="date"
            value={form.hireDate}
            onChange={(e) => set("hireDate")(e.target.value)}
          />
        </Field>
        <Field
          label="Salary"
          htmlFor="hire-salary"
          hint="Optional — can be updated later"
        >
          <HireInput
            id="hire-salary"
            type="number"
            min={0}
            value={form.salary}
            onChange={(e) => set("salary")(e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Office Location" htmlFor="hire-location">
          <HireInput
            id="hire-location"
            value={form.workLocation}
            onChange={(e) => set("workLocation")(e.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="hire-status">
          <select
            id="hire-status"
            className={hireSelectClassName}
            value={form.status}
            onChange={(e) =>
              set("status")(e.target.value as EmployeeStatusValue)
            }
            disabled={!editing}
          >
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EMPLOYEE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" htmlFor="hire-notes" className="sm:col-span-2">
          <HireInput
            id="hire-notes"
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function StepSecurity({
  form,
  editing,
  hireResult,
  suggestedCompanyEmail,
}: {
  form: HireFormState;
  editing: EmployeeProfile | null;
  hireResult?: HireEmployeeResult | null;
  suggestedCompanyEmail: string;
}) {
  const loginEmail = form.email.trim() || suggestedCompanyEmail;
  const hasExistingCredentials = Boolean(
    editing?.badgeNumber || editing?.qrToken || editing?.companyEmail,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {hireResult
          ? "Security assets generated for this employee:"
          : editing && hasExistingCredentials
            ? "Existing security assets for this employee:"
            : "The following will be generated automatically when the employee is created:"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <SecurityCard
          icon={Mail}
          title="Username / Login"
          value={
            (hireResult?.companyEmail ??
              hireResult?.employee.companyEmail ??
              editing?.companyEmail ??
              form.companyEmail) ||
            loginEmail
          }
          hint="Primary sign-in email"
        />
        <SecurityCard
          icon={KeyRound}
          title="Temporary Password"
          value={
            hireResult?.temporaryPassword ??
            (editing ? "Already set — use password reset" : "Generated on hire")
          }
          hint={
            hireResult?.mustChangePassword
              ? "Must change password on first login"
              : "Shown once after creation"
          }
          mono={Boolean(hireResult?.temporaryPassword)}
        />
        <SecurityCard
          icon={Shield}
          title="Must Change Password"
          value={
            hireResult?.mustChangePassword || !editing
              ? "Enabled on first login"
              : "Managed via password reset"
          }
          hint="Forced password change for new hires"
        />
        <SecurityCard
          icon={BadgeCheck}
          title="Role"
          value="Employee"
          hint="Default platform role for hires"
        />
        <SecurityCard
          icon={ListChecks}
          title="Permissions Preview"
          value="Team self-service · Attendance · Leave requests"
          hint="Managers inherit additional scoped permissions"
        />
        <SecurityCard
          icon={QrCode}
          title="Employee QR Code"
          value={
            hireResult?.qrToken ?? editing?.qrToken ?? "Unique QR token on hire"
          }
          hint="For attendance & verification"
          mono={Boolean(hireResult?.qrToken ?? editing?.qrToken)}
        />
        <SecurityCard
          icon={IdCard}
          title="Employee ID Card"
          value={
            hireResult?.employee.employeeCode ??
            editing?.employeeCode ??
            "Auto-generated EMP code"
          }
          hint="Printable ID card available after hire"
        />
      </div>
    </div>
  );
}

function SecurityCard({
  icon: Icon,
  title,
  value,
  hint,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  hint: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/30">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p
        className={cn(
          "text-sm text-foreground",
          mono && "break-all font-mono text-xs",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function StepFinish({
  form,
  editing,
  departments,
  teams,
  managers,
}: {
  form: HireFormState;
  editing: boolean;
  departments: Department[];
  teams: Team[];
  managers: EmployeeProfile[];
}) {
  const department = departments.find((d) => d.id === form.departmentId);
  const team = teams.find((t) => t.id === form.primaryTeamId);
  const manager = managers.find((m) => m.userId === form.managerId);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <h3 className="mb-3 text-sm font-medium">
          Review before {editing ? "saving" : "creating"}
        </h3>
        <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <ReviewItem
            label="Name"
            value={`${form.firstName} ${form.lastName}`.trim()}
          />
          <ReviewItem label="Login email" value={form.email} />
          <ReviewItem label="Phone" value={form.phone || "—"} />
          <ReviewItem label="Department" value={department?.name ?? "—"} />
          <ReviewItem label="Team" value={team?.name ?? "None"} />
          <ReviewItem label="Designation" value={form.designation || "—"} />
          <ReviewItem
            label="Manager"
            value={manager ? formatEmployeeName(manager) : "None"}
          />
          <ReviewItem label="Joining date" value={form.hireDate || "—"} />
          <ReviewItem
            label="Employment type"
            value={EMPLOYMENT_TYPE_LABELS[form.employmentType]}
          />
          <ReviewItem
            label="Languages"
            value={form.languages.join(", ") || "—"}
          />
          <ReviewItem label="City" value={form.city || "—"} />
          <ReviewItem label="Country" value={form.country || "—"} />
        </dl>
      </div>
      {!editing ? (
        <p className="text-sm text-muted-foreground">
          Click{" "}
          <span className="font-medium text-foreground">Finish</span> to
          provision the account, send an invitation email, and generate security
          assets.
        </p>
      ) : null}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function SuccessPanel({ hireResult }: { hireResult: HireEmployeeResult }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-medium text-foreground">
            Employee created successfully
          </p>
          <p className="text-sm text-muted-foreground">
            ID{" "}
            <span className="font-medium text-foreground">
              {hireResult.employee.employeeCode}
            </span>
            {" · "}
            {formatEmployeeName(hireResult.employee)}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-5 text-sm shadow-[var(--shadow-xs)]">
        <p>
          <span className="text-muted-foreground">Login email: </span>
          {hireResult.employee.user?.email}
        </p>
        {hireResult.companyEmail ? (
          <p>
            <span className="text-muted-foreground">Company email: </span>
            {hireResult.companyEmail}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Temporary password: </span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {hireResult.temporaryPassword}
          </code>
        </p>
        {hireResult.qrToken ? (
          <p>
            <span className="text-muted-foreground">QR token: </span>
            <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {hireResult.qrToken}
            </code>
          </p>
        ) : null}
        {hireResult.badgeNumber ? (
          <p>
            <span className="text-muted-foreground">Badge number: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {hireResult.badgeNumber}
            </code>
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {hireResult.invitationSent
            ? "Email invitation and in-app notification were sent."
            : "Invitation notification queued. Share the temporary password securely if email delivery is delayed."}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  error,
  hint,
  required,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-primary" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
