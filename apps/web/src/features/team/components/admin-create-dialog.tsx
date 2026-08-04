"use client";

import {
  ADMIN_PERMISSION_PRESETS,
  createAdminSchema,
  EMPLOYEE_GENDERS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  MARITAL_STATUSES,
  WORK_SHIFTS,
  type AdminPermissionPresetValue,
  type CreateAdminInput,
  type CreateAdminResult,
  type Department,
  type EmployeeProfile,
  type EmployeeStatusValue,
  type EmploymentTypeValue,
  type MaritalStatusValue,
  type UpdateEmployeeProfileInput,
  type WorkShiftValue,
} from "@enterprise/shared";
import {
  BadgeCheck,
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
} from "react";

import { Button } from "@/components/ui/button";
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
  WORK_SHIFT_LABELS,
} from "../types/team.types";
import { EmployeeAvatar, mutationError } from "./team-shared";
import {
  decodeHrMeta,
  encodeHrMeta,
  formGridClassName,
  HireInput,
  hireSelectClassName,
  SectionCard,
  useWizardLeaveGuard,
  WizardBackButton,
  WizardField,
  WizardHelpButton,
  WizardLeaveConfirmDialog,
  WizardStepper,
} from "./team-wizard-shell";

const WIZARD_STEPS = [
  { id: 1, title: "Basic Information", short: "Basic" },
  { id: 2, title: "Contact Information", short: "Contact" },
  { id: 3, title: "Employment Details", short: "Employment" },
  { id: 4, title: "Security & Permissions", short: "Security" },
  { id: 5, title: "Review & Finish", short: "Review" },
] as const;

const MARITAL_STATUS_LABELS: Record<MaritalStatusValue, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
  PREFER_NOT_TO_SAY: "Prefer not to say",
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

const PRESET_LABELS: Record<AdminPermissionPresetValue, string> = {
  FULL: "Full access",
  HR: "HR operations",
  OPERATIONS: "Operations",
  FINANCE: "Finance",
  READ_ONLY: "Read only",
};

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const DRAFT_STORAGE_KEY = "eliteflow.team.admin-draft.v1";

type FieldErrors = Partial<Record<keyof AdminFormState | "form", string>>;

type AdminFormState = {
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
  postalCode: string;
  hireDate: string;
  departmentId: string;
  designation: string;
  employmentType: EmploymentTypeValue;
  managerId: string;
  workLocation: string;
  shift: string;
  salary: string;
  status: EmployeeStatusValue;
  notes: string;
  photoUrl: string;
  permissionPreset: AdminPermissionPresetValue;
  requirePasswordChange: boolean;
  enableTwoFactor: boolean;
  sendInvitation: boolean;
};

const emptyAdminForm = (): AdminFormState => ({
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
  postalCode: "",
  hireDate: todayDateOnly(),
  departmentId: "",
  designation: "Administrator",
  employmentType: "FULL_TIME",
  managerId: "",
  workLocation: "",
  shift: "",
  salary: "",
  status: "ACTIVE",
  notes: "",
  photoUrl: "",
  permissionPreset: "FULL",
  requirePasswordChange: true,
  enableTwoFactor: false,
  sendInvitation: true,
});

function isValidEmail(value: string): boolean {
  return createAdminSchema.shape.email.safeParse(value.trim()).success;
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

function formFromEmployee(editing: EmployeeProfile): AdminFormState {
  const meta = decodeHrMeta(editing.bio);
  return {
    ...emptyAdminForm(),
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
    postalCode: meta.postalCode,
    hireDate: editing.hireDate ?? todayDateOnly(),
    departmentId: editing.departmentId ?? "",
    designation: editing.designation ?? "Administrator",
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

export function AdminCreateDialog({
  open,
  departments,
  onOpenChange,
  onSubmit,
  isPending,
  error,
  result,
  onClearResult,
  managers = [],
  editing = null,
  onUpdate,
}: {
  open: boolean;
  departments: Department[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateAdminInput) => void;
  isPending: boolean;
  error: unknown;
  result?: CreateAdminResult | null;
  onClearResult?: () => void;
  managers?: EmployeeProfile[];
  editing?: EmployeeProfile | null;
  onUpdate?: (values: UpdateEmployeeProfileInput) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AdminFormState>(emptyAdminForm());
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
        const parsed = JSON.parse(raw) as Partial<AdminFormState>;
        const nextForm = { ...emptyAdminForm(), ...parsed };
        const nextPhoto =
          parsed.photoUrl && isValidHttpUrl(parsed.photoUrl)
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

    const nextForm = emptyAdminForm();
    setForm(nextForm);
    setPhotoPreview(null);
    setBaselineFormJson(JSON.stringify(nextForm));
    setBaselinePhoto(null);
  }, [open, editing, revokeObjectUrl]);

  useEffect(() => {
    if (result && !editing) {
      setStep(5);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [result, editing]);

  useEffect(() => {
    return () => revokeObjectUrl();
  }, [revokeObjectUrl]);

  const set =
    (key: keyof AdminFormState) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

  const setBool =
    (key: "requirePasswordChange" | "enableTwoFactor" | "sendInvitation") =>
    (value: boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const suggestedCompanyEmail = useMemo(
    () => companyEmailHint(form.firstName, form.lastName),
    [form.firstName, form.lastName],
  );

  const displayPhoto =
    photoPreview ||
    (isValidHttpUrl(form.photoUrl) ? form.photoUrl.trim() : null);

  const departmentName =
    departments.find((d) => d.id === form.departmentId)?.name ?? "—";
  const selectedManager = managers.find((m) => m.userId === form.managerId);
  const managerName = selectedManager
    ? formatEmployeeName(selectedManager)
    : "—";

  const buildCreatePayload = (): CreateAdminInput => {
    const photo = isValidHttpUrl(form.photoUrl) ? form.photoUrl.trim() : null;
    const bio = encodeHrMeta({
      nationality: form.nationality,
      religion: form.religion,
      province: form.province,
      postalCode: form.postalCode,
    });

    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      nationalId: form.nationalId.trim() || null,
      gender: form.gender
        ? (form.gender as CreateAdminInput["gender"])
        : null,
      dateOfBirth: form.dateOfBirth || null,
      hireDate: form.hireDate || null,
      departmentId: form.departmentId,
      designation: form.designation.trim() || "Administrator",
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
        ? (form.maritalStatus as CreateAdminInput["maritalStatus"])
        : null,
      bloodGroup: form.bloodGroup.trim() || null,
      personalEmail: form.personalEmail.trim() || null,
      companyEmail: form.companyEmail.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      shift: form.shift ? (form.shift as CreateAdminInput["shift"]) : null,
      skills: form.languages,
      documentUrls: [],
      annualLeaveBalance: 20,
      sickLeaveBalance: 10,
      casualLeaveBalance: 10,
      medicalLeaveBalance: 15,
      lifecycleStage: "ACTIVE",
      bio,
      permissionPreset: form.permissionPreset,
      sendInvitation: form.sendInvitation,
      requirePasswordChange: form.requirePasswordChange,
      enableTwoFactor: form.enableTwoFactor,
    };
  };

  const buildUpdatePayload = (): UpdateEmployeeProfileInput => {
    const createPayload = buildCreatePayload();
    const {
      email: _omitEmail,
      permissionPreset: _omitPreset,
      sendInvitation: _omitInvite,
      requirePasswordChange: _omitRequire,
      enableTwoFactor: _omit2fa,
      ...updateFields
    } = createPayload;
    void _omitEmail;
    void _omitPreset;
    void _omitInvite;
    void _omitRequire;
    void _omit2fa;
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
      onUpdate?.(buildUpdatePayload());
      return;
    }

    const payload = buildCreatePayload();
    const parsed = createAdminSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          typeof key === "string" &&
          !nextErrors[key as keyof AdminFormState]
        ) {
          nextErrors[key as keyof AdminFormState] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      if (nextErrors.firstName || nextErrors.lastName) setStep(1);
      else if (nextErrors.email) setStep(2);
      else if (nextErrors.departmentId) setStep(3);
      return;
    }

    setFieldErrors({});
    onSubmit(parsed.data);
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

  const isSuccess = Boolean(result && !editing && step === 5);

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
  const progressPercent = Math.round(
    (completedSteps / WIZARD_STEPS.length) * 100,
  );

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <WizardBackButton
            onClick={isSuccess ? handleClose : requestLeave}
            disabled={isPending}
          />
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Team / Admins /{" "}
            <span className="text-foreground">
              {editing ? "Edit Admin" : "Add Admin"}
            </span>
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
              {editing
                ? "Edit Admin"
                : isSuccess
                  ? "Admin Registered"
                  : "Add New Admin"}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {editing
                ? "Update the administrator profile. Required fields are marked with *."
                : isSuccess
                  ? "Account provisioned successfully. Share credentials securely."
                  : "Create a new administrator account. Required fields are marked with *."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isSuccess ? (
            <WizardHelpButton onClick={() => setHelpOpen(true)} />
          ) : (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </div>

      {!isSuccess ? (
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={step}
          progressPercent={progressPercent}
          onStepChange={setStep}
        />
      ) : null}

      <div className="mt-6 pb-5">
        {isSuccess && result ? (
          <SuccessPanel result={result} />
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
              <AdminPreviewCard
                form={form}
                editingCode={editing?.adminCode ?? editing?.employeeCode}
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
                    description="Personal details about the administrator"
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
                    description="How we reach the admin and emergency contacts"
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
                      editingCode={editing?.adminCode}
                      departments={departments}
                      managers={managers}
                      fieldErrors={fieldErrors}
                    />
                  </SectionCard>
                ) : null}

                {step === 4 ? (
                  <SectionCard
                    icon={Shield}
                    title="Security & Permissions"
                    description="Login credentials, access level, and account controls"
                  >
                    <StepSecurity
                      form={form}
                      editing={editing}
                      result={result}
                      suggestedCompanyEmail={suggestedCompanyEmail}
                      set={set}
                      setBool={setBool}
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
                        : "Confirm details before creating the admin account"
                    }
                  >
                    <StepFinish
                      form={form}
                      editing={Boolean(editing)}
                      departments={departments}
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
                            ? "Save admin changes"
                            : "Create admin account"
                        }
                        disabled={
                          isPending ||
                          !canProceedStep(1) ||
                          !canProceedStep(2) ||
                          !canProceedStep(3) ||
                          (Boolean(editing) && !onUpdate)
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
  form: AdminFormState;
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
              alt="Admin preview"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <EmployeeAvatar
              name={`${form.firstName} ${form.lastName}`.trim() || "New admin"}
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
        <Label htmlFor="admin-photo-url" className="text-sm font-medium">
          Photo URL
        </Label>
        <HireInput
          id="admin-photo-url"
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

function AdminPreviewCard({
  form,
  editingCode,
  departmentName,
  managerName,
}: {
  form: AdminFormState;
  editingCode?: string | null;
  departmentName: string;
  managerName: string;
}) {
  const rows: Array<{ label: string; value: string; accent?: boolean }> = [
    {
      label: "Admin ID",
      value: editingCode ?? "ADM-XXXX",
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
        Admin Preview
      </h3>
      <p className="mb-4 text-base font-semibold text-foreground">
        {`${form.firstName} ${form.lastName}`.trim() || "New admin"}
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
              "Admin ID is generated automatically (ADM-XXXX)",
              "Department must be selected to continue",
              "Salary is optional and can be updated later",
            ]
          : step === 4
            ? [
                "Temporary password is shown once after creation",
                "Permission preset controls admin access scope",
                "Email invitation shares credentials securely",
              ]
            : [
                "Review every section before finishing",
                "Credentials are emailed when creation succeeds",
                "Admin ID card becomes available after creation",
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
            Admin registration help
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
              records, platform access, and admin permission scoping.
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
  form: AdminFormState;
  set: (key: keyof AdminFormState) => (value: string) => void;
  fieldErrors: FieldErrors;
  languageInput: string;
  onLanguageInputChange: (value: string) => void;
  onAddLanguage: (value: string) => void;
  onRemoveLanguage: (value: string) => void;
}) {
  return (
    <div className={formGridClassName}>
      <WizardField
        label="First Name"
        htmlFor="admin-first"
        required
        error={fieldErrors.firstName}
      >
        <HireInput
          id="admin-first"
          value={form.firstName}
          onChange={(e) => set("firstName")(e.target.value)}
          autoComplete="given-name"
          error={Boolean(fieldErrors.firstName)}
        />
      </WizardField>
      <WizardField
        label="Last Name"
        htmlFor="admin-last"
        required
        error={fieldErrors.lastName}
      >
        <HireInput
          id="admin-last"
          value={form.lastName}
          onChange={(e) => set("lastName")(e.target.value)}
          autoComplete="family-name"
          error={Boolean(fieldErrors.lastName)}
        />
      </WizardField>
      <WizardField label="Father Name" htmlFor="admin-father">
        <HireInput
          id="admin-father"
          value={form.fatherName}
          onChange={(e) => set("fatherName")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Gender" htmlFor="admin-gender">
        <select
          id="admin-gender"
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
      </WizardField>
      <WizardField label="Date of Birth" htmlFor="admin-dob">
        <HireInput
          id="admin-dob"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set("dateOfBirth")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Marital Status" htmlFor="admin-marital">
        <select
          id="admin-marital"
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
      </WizardField>
      <WizardField
        label="CNIC / National ID"
        htmlFor="admin-cnic"
        hint="Use the official government ID format"
      >
        <HireInput
          id="admin-cnic"
          value={form.nationalId}
          onChange={(e) => set("nationalId")(e.target.value)}
          placeholder="xxxxx-xxxxxxx-x"
        />
      </WizardField>
      <WizardField label="Blood Group" htmlFor="admin-blood">
        <select
          id="admin-blood"
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
      </WizardField>
      <WizardField label="Nationality" htmlFor="admin-nationality">
        <HireInput
          id="admin-nationality"
          value={form.nationality}
          onChange={(e) => set("nationality")(e.target.value)}
          placeholder="e.g. Pakistani"
        />
      </WizardField>
      <WizardField label="Religion" htmlFor="admin-religion">
        <HireInput
          id="admin-religion"
          value={form.religion}
          onChange={(e) => set("religion")(e.target.value)}
        />
      </WizardField>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="admin-languages" className="text-sm font-medium">
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
            id="admin-languages"
            value={languageInput}
            onChange={(e) => onLanguageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onAddLanguage(languageInput.replace(/,/g, ""));
              }
            }}
            list="admin-language-options"
            placeholder="Type and press Enter"
            className="min-w-[160px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <datalist id="admin-language-options">
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
  form: AdminFormState;
  set: (key: keyof AdminFormState) => (value: string) => void;
  editing: boolean;
  suggestedCompanyEmail: string;
  fieldErrors: FieldErrors;
}) {
  return (
    <div className={formGridClassName}>
      <WizardField
        label="Login Email"
        htmlFor="admin-email"
        required
        error={fieldErrors.email}
        hint={editing ? "Login email cannot be changed here" : undefined}
      >
        <HireInput
          id="admin-email"
          type="email"
          value={form.email}
          disabled={editing}
          onChange={(e) => set("email")(e.target.value)}
          error={Boolean(fieldErrors.email)}
        />
      </WizardField>
      <WizardField
        label="Company Email"
        htmlFor="admin-company-email"
        hint={`Suggested: ${suggestedCompanyEmail}`}
      >
        <HireInput
          id="admin-company-email"
          type="email"
          value={form.companyEmail}
          onChange={(e) => set("companyEmail")(e.target.value)}
          placeholder={suggestedCompanyEmail}
        />
      </WizardField>
      <WizardField label="Personal Email" htmlFor="admin-personal-email">
        <HireInput
          id="admin-personal-email"
          type="email"
          value={form.personalEmail}
          onChange={(e) => set("personalEmail")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Phone" htmlFor="admin-phone">
        <HireInput
          id="admin-phone"
          value={form.phone}
          onChange={(e) => set("phone")(e.target.value)}
          placeholder="+92 …"
        />
      </WizardField>
      <WizardField label="Emergency Contact" htmlFor="admin-ec-name">
        <HireInput
          id="admin-ec-name"
          value={form.emergencyContactName}
          onChange={(e) => set("emergencyContactName")(e.target.value)}
          placeholder="Name"
        />
      </WizardField>
      <WizardField label="Emergency Phone" htmlFor="admin-ec-phone">
        <HireInput
          id="admin-ec-phone"
          value={form.emergencyContactPhone}
          onChange={(e) => set("emergencyContactPhone")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Emergency Relation" htmlFor="admin-ec-rel">
        <HireInput
          id="admin-ec-rel"
          value={form.emergencyContactRelation}
          onChange={(e) => set("emergencyContactRelation")(e.target.value)}
        />
      </WizardField>
      <WizardField
        label="Address"
        htmlFor="admin-address"
        className="sm:col-span-2"
      >
        <HireInput
          id="admin-address"
          value={form.address}
          onChange={(e) => set("address")(e.target.value)}
        />
      </WizardField>
      <WizardField label="City" htmlFor="admin-city">
        <HireInput
          id="admin-city"
          value={form.city}
          onChange={(e) => set("city")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Province" htmlFor="admin-province">
        <HireInput
          id="admin-province"
          value={form.province}
          onChange={(e) => set("province")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Country" htmlFor="admin-country">
        <HireInput
          id="admin-country"
          value={form.country}
          onChange={(e) => set("country")(e.target.value)}
        />
      </WizardField>
      <WizardField label="Postal Code" htmlFor="admin-postal">
        <HireInput
          id="admin-postal"
          value={form.postalCode}
          onChange={(e) => set("postalCode")(e.target.value)}
        />
      </WizardField>
    </div>
  );
}

function StepEmployment({
  form,
  set,
  editing,
  editingCode,
  departments,
  managers,
  fieldErrors,
}: {
  form: AdminFormState;
  set: (key: keyof AdminFormState) => (value: string) => void;
  editing: boolean;
  editingCode?: string | null;
  departments: Department[];
  managers: EmployeeProfile[];
  fieldErrors: FieldErrors;
}) {
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        Admin ID is auto-generated on create (e.g. ADM-0001). You do not need to
        enter it manually.
      </p>
      <div className={formGridClassName}>
        <WizardField
          label="Admin ID"
          htmlFor="admin-code"
          hint="Assigned automatically on save"
        >
          <HireInput
            id="admin-code"
            value={editingCode ?? "Auto-generated"}
            disabled
          />
        </WizardField>
        <WizardField
          label="Department"
          htmlFor="admin-dept"
          required
          error={fieldErrors.departmentId}
        >
          <select
            id="admin-dept"
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
        </WizardField>
        <WizardField label="Designation" htmlFor="admin-designation">
          <HireInput
            id="admin-designation"
            value={form.designation}
            onChange={(e) => set("designation")(e.target.value)}
          />
        </WizardField>
        <WizardField label="Reporting Manager" htmlFor="admin-manager">
          <select
            id="admin-manager"
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
        </WizardField>
        <WizardField label="Joining Date" htmlFor="admin-join">
          <HireInput
            id="admin-join"
            type="date"
            value={form.hireDate}
            onChange={(e) => set("hireDate")(e.target.value)}
          />
        </WizardField>
        <WizardField label="Employment Type" htmlFor="admin-type">
          <select
            id="admin-type"
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
        </WizardField>
        <WizardField label="Office Location" htmlFor="admin-location">
          <HireInput
            id="admin-location"
            value={form.workLocation}
            onChange={(e) => set("workLocation")(e.target.value)}
          />
        </WizardField>
        <WizardField label="Shift" htmlFor="admin-shift">
          <select
            id="admin-shift"
            className={hireSelectClassName}
            value={form.shift}
            onChange={(e) => set("shift")(e.target.value)}
          >
            <option value="">Select shift</option>
            {WORK_SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {WORK_SHIFT_LABELS[shift as WorkShiftValue]}
              </option>
            ))}
          </select>
        </WizardField>
        <WizardField
          label="Salary"
          htmlFor="admin-salary"
          hint="Optional — can be updated later"
        >
          <HireInput
            id="admin-salary"
            type="number"
            min={0}
            value={form.salary}
            onChange={(e) => set("salary")(e.target.value)}
            placeholder="Optional"
          />
        </WizardField>
        <WizardField label="Status" htmlFor="admin-status">
          <select
            id="admin-status"
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
        </WizardField>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function StepSecurity({
  form,
  editing,
  result,
  suggestedCompanyEmail,
  set,
  setBool,
}: {
  form: AdminFormState;
  editing: EmployeeProfile | null;
  result?: CreateAdminResult | null;
  suggestedCompanyEmail: string;
  set: (key: keyof AdminFormState) => (value: string) => void;
  setBool: (
    key: "requirePasswordChange" | "enableTwoFactor" | "sendInvitation",
  ) => (value: boolean) => void;
}) {
  const loginEmail = form.email.trim() || suggestedCompanyEmail;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {result
          ? "Security assets generated for this admin:"
          : editing
            ? "Existing account security for this administrator:"
            : "Credentials and permissions will be applied when the admin is created:"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <SecurityCard
          icon={Mail}
          title="Username / Login"
          value={
            (result?.companyEmail ??
              result?.employee.companyEmail ??
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
            result?.temporaryPassword ??
            (editing ? "Already set — use password reset" : "Generated on create")
          }
          hint={
            result?.mustChangePassword || form.requirePasswordChange
              ? "Must change password on first login"
              : "Shown once after creation"
          }
          mono={Boolean(result?.temporaryPassword)}
        />
        <SecurityCard
          icon={BadgeCheck}
          title="Role"
          value="Admin"
          hint="Platform administrator role"
        />
        <SecurityCard
          icon={IdCard}
          title="Account Status"
          value={EMPLOYEE_STATUS_LABELS[form.status]}
          hint="Employment / account status"
        />
        <SecurityCard
          icon={QrCode}
          title="Admin QR Code"
          value={
            result?.qrToken ?? editing?.qrToken ?? "Unique QR token on create"
          }
          hint="For attendance & verification"
          mono={Boolean(result?.qrToken ?? editing?.qrToken)}
        />
        <SecurityCard
          icon={ListChecks}
          title="Permission Groups"
          value={PRESET_LABELS[form.permissionPreset]}
          hint="Scoped admin access preset"
        />
      </div>

      <div className={formGridClassName}>
        <WizardField label="Permission Groups" htmlFor="admin-perms">
          <select
            id="admin-perms"
            className={hireSelectClassName}
            value={form.permissionPreset}
            onChange={(e) =>
              set("permissionPreset")(
                e.target.value as AdminPermissionPresetValue,
              )
            }
            disabled={Boolean(editing)}
          >
            {ADMIN_PERMISSION_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {PRESET_LABELS[preset]}
              </option>
            ))}
          </select>
        </WizardField>
        <WizardField label="Role" htmlFor="admin-role-display">
          <HireInput id="admin-role-display" value="Admin" disabled />
        </WizardField>
      </div>

      <div className="space-y-3">
        <ToggleRow
          id="admin-require-password"
          label="Must change password"
          description="Force password change on first login"
          checked={form.requirePasswordChange}
          onChange={setBool("requirePasswordChange")}
          disabled={Boolean(editing)}
        />
        <ToggleRow
          id="admin-2fa"
          label="Two-Factor Authentication"
          description="Store 2FA preference in audit/metadata for this admin"
          checked={form.enableTwoFactor}
          onChange={setBool("enableTwoFactor")}
          disabled={Boolean(editing)}
        />
        <ToggleRow
          id="admin-invite"
          label="Email Invitation"
          description="Send login credentials and invitation email on create"
          checked={form.sendInvitation}
          onChange={setBool("sendInvitation")}
          disabled={Boolean(editing)}
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
  managers,
}: {
  form: AdminFormState;
  editing: boolean;
  departments: Department[];
  managers: EmployeeProfile[];
}) {
  const department = departments.find((d) => d.id === form.departmentId);
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
          <ReviewItem label="Designation" value={form.designation || "—"} />
          <ReviewItem
            label="Reporting manager"
            value={manager ? formatEmployeeName(manager) : "None"}
          />
          <ReviewItem label="Joining date" value={form.hireDate || "—"} />
          <ReviewItem
            label="Employment type"
            value={EMPLOYMENT_TYPE_LABELS[form.employmentType]}
          />
          <ReviewItem
            label="Permission groups"
            value={PRESET_LABELS[form.permissionPreset]}
          />
          <ReviewItem
            label="Must change password"
            value={form.requirePasswordChange ? "Yes" : "No"}
          />
          <ReviewItem
            label="Two-factor auth"
            value={form.enableTwoFactor ? "Enabled" : "Disabled"}
          />
          <ReviewItem
            label="Email invitation"
            value={form.sendInvitation ? "Send on create" : "Do not send"}
          />
          <ReviewItem
            label="Languages"
            value={form.languages.join(", ") || "—"}
          />
          <ReviewItem label="City" value={form.city || "—"} />
          <ReviewItem label="Country" value={form.country || "—"} />
          <ReviewItem label="Postal code" value={form.postalCode || "—"} />
        </dl>
      </div>
      {!editing ? (
        <p className="text-sm text-muted-foreground">
          Click{" "}
          <span className="font-medium text-foreground">Finish</span> to
          provision the admin account
          {form.sendInvitation ? ", send an invitation email," : ""} and apply
          the selected permission preset.
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

function SuccessPanel({ result }: { result: CreateAdminResult }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-medium text-foreground">
            Admin created successfully
          </p>
          <p className="text-sm text-muted-foreground">
            ID{" "}
            <span className="font-medium text-foreground">
              {result.employee.adminCode ?? result.employee.employeeCode}
            </span>
            {" · "}
            {formatEmployeeName(result.employee)}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-5 text-sm shadow-[var(--shadow-xs)]">
        <p>
          <span className="text-muted-foreground">Login email: </span>
          {result.employee.user?.email}
        </p>
        {result.companyEmail ? (
          <p>
            <span className="text-muted-foreground">Company email: </span>
            {result.companyEmail}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Temporary password: </span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {result.temporaryPassword}
          </code>
        </p>
        {result.qrToken ? (
          <p>
            <span className="text-muted-foreground">QR token: </span>
            <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {result.qrToken}
            </code>
          </p>
        ) : null}
        {result.badgeNumber ? (
          <p>
            <span className="text-muted-foreground">Badge number: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {result.badgeNumber}
            </code>
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {result.invitationSent
            ? "Email invitation and in-app notification were sent."
            : "Invitation notification queued. Share the temporary password securely if email delivery is delayed."}
        </p>
      </div>
    </div>
  );
}
