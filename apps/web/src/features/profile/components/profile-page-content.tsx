"use client";

import {
  PROFILE_DOCUMENT_TYPES,
  type ProfileDocumentType,
  type SettingsProfileDto,
} from "@enterprise/shared";
import {
  Camera,
  Download,
  FileText,
  Loader2,
  Pencil,
  Shield,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { ApiClientError } from "@/services/api/api-error";
import { settingsService } from "@/features/settings/services/settings.service";
import { cn } from "@/lib/utils";

import {
  useDeleteProfileDocumentMutation,
  useProfileDocuments,
  useProfileOverview,
  useRemoveAvatarMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUploadProfileDocumentMutation,
} from "../hooks/use-profile";

function formatBytes(size: number | null | undefined) {
  if (size == null || Number.isNaN(size)) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function Feedback({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;
  return (
    <p
      className={cn(
        "text-sm",
        error ? "text-destructive" : "text-emerald-700 dark:text-emerald-400",
      )}
      role="status"
    >
      {error ?? success}
    </p>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

type ProfileSection = "overview" | "edit" | "documents" | "security";

export function ProfilePageContent() {
  const overviewQuery = useProfileOverview();
  const documentsQuery = useProfileDocuments();
  const [section, setSection] = useState<ProfileSection>("overview");
  const [feedback, setFeedback] = useState<{
    error: string | null;
    success: string | null;
  }>({ error: null, success: null });

  const profile = overviewQuery.data?.profile;

  if (overviewQuery.isLoading && !profile) {
    return <ProfileSkeleton />;
  }

  if (overviewQuery.isError || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load profile</CardTitle>
          <CardDescription>
            {overviewQuery.error instanceof ApiClientError
              ? overviewQuery.error.message
              : "Please refresh and try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => void overviewQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal information, profile picture, and identity documents."
      />

      <ProfileHero
        profile={profile}
        onEdit={() => setSection("edit")}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Profile sections"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {(
            [
              ["overview", "Overview"],
              ["edit", "Edit profile"],
              ["documents", "Documents"],
              ["security", "Security"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={section === id ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => {
                setFeedback({ error: null, success: null });
                setSection(id);
              }}
            >
              {label}
            </Button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          <Feedback error={feedback.error} success={feedback.success} />
          {section === "overview" ? (
            <OverviewSection profile={profile} />
          ) : null}
          {section === "edit" ? (
            <EditProfileSection
              profile={profile}
              onFeedback={setFeedback}
            />
          ) : null}
          {section === "documents" ? (
            <DocumentsSection
              isLoading={documentsQuery.isLoading}
              error={
                documentsQuery.error instanceof ApiClientError
                  ? documentsQuery.error.message
                  : documentsQuery.isError
                    ? "Could not load documents."
                    : null
              }
              documents={documentsQuery.data ?? []}
              onFeedback={setFeedback}
            />
          ) : null}
          {section === "security" ? <SecuritySection profile={profile} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileHero({
  profile,
  onEdit,
}: {
  profile: SettingsProfileDto;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  // Canonical avatar source = authenticated user (same as Header).
  const avatarUrl = user?.avatarUrl ?? profile.avatarUrl;
  const firstName = user?.firstName ?? profile.firstName;
  const lastName = user?.lastName ?? profile.lastName;
  const uploadAvatar = useUploadAvatarMutation();
  const removeAvatar = useRemoveAvatarMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [localError, setLocalError] = useState<string | null>(null);

  const displayName = `${firstName} ${lastName}`.trim();

  async function onAvatarSelected(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    try {
      await uploadAvatar.mutateAsync(file);
    } catch (error) {
      setLocalError(
        error instanceof ApiClientError
          ? error.message
          : "Could not update profile picture.",
      );
    }
  }

  return (
    <Card className="overflow-hidden border-border/70">
      <div className="h-24 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600" />
      <CardContent className="-mt-12 space-y-4 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative">
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                avatarUrl={avatarUrl}
                className="size-24 border-4 border-background shadow-md"
                fallbackClassName="text-xl"
                alt={displayName}
              />
              <input
                id={inputId}
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  void onAvatarSelected(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-1 right-1 size-8 rounded-full"
                aria-label="Change profile picture"
                disabled={uploadAvatar.isPending || removeAvatar.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </Button>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.role ? (
                  <Badge variant="secondary">{profile.role.name}</Badge>
                ) : null}
                {profile.department ? (
                  <Badge variant="outline">{profile.department}</Badge>
                ) : null}
                {profile.designation ? (
                  <Badge variant="outline">{profile.designation}</Badge>
                ) : null}
                <Badge variant="outline">{profile.status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {avatarUrl ? (
              <Button
                type="button"
                variant="outline"
                disabled={removeAvatar.isPending || uploadAvatar.isPending}
                onClick={() => {
                  setLocalError(null);
                  void removeAvatar.mutateAsync().catch((error: unknown) => {
                    setLocalError(
                      error instanceof ApiClientError
                        ? error.message
                        : "Could not remove profile picture.",
                    );
                  });
                }}
              >
                Remove photo
              </Button>
            ) : null}
            <Button type="button" onClick={onEdit}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />
              Edit profile
            </Button>
          </div>
        </div>
        {localError ? (
          <p className="text-sm text-destructive">{localError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OverviewSection({ profile }: { profile: SettingsProfileDto }) {
  const rows: Array<[string, string]> = [
    ["Full name", `${profile.firstName} ${profile.lastName}`.trim()],
    ["Email", profile.email],
    ["Username", profile.username || "—"],
    ["Phone", profile.phone || "—"],
    ["Job title", profile.designation || "—"],
    ["Department", profile.department || "—"],
    ["Address", profile.address || "—"],
    ["City", profile.city || "—"],
    ["Country", profile.country || "—"],
    ["Date of birth", profile.dateOfBirth || "—"],
    ["Work location", profile.workLocation || "—"],
    ["Personal email", profile.personalEmail || "—"],
    ["Account status", profile.status],
    [
      "Email verified",
      profile.emailVerified ? "Verified" : "Not verified",
    ],
    [
      "Two-factor authentication",
      profile.twoFactorEnabled ? "Enabled" : "Disabled",
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4" aria-hidden="true" />
          Personal information
        </CardTitle>
        <CardDescription>
          Your account details as stored in EliteFlow. Email and role cannot be
          changed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {profile.bio ? (
          <div className="mt-6 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bio
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {profile.bio}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EditProfileSection({
  profile,
  onFeedback,
}: {
  profile: SettingsProfileDto;
  onFeedback: (value: { error: string | null; success: string | null }) => void;
}) {
  const mutation = useUpdateProfileMutation();
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username ?? "",
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
    designation: profile.designation ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    personalEmail: profile.personalEmail ?? "",
    workLocation: profile.workLocation ?? "",
  });

  useEffect(() => {
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      designation: profile.designation ?? "",
      address: profile.address ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      personalEmail: profile.personalEmail ?? "",
      workLocation: profile.workLocation ?? "",
    });
  }, [profile]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    onFeedback({ error: null, success: null });
    try {
      const result = await mutation.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim() || null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        designation: form.designation.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        dateOfBirth: form.dateOfBirth.trim() || null,
        personalEmail: form.personalEmail.trim() || null,
        workLocation: form.workLocation.trim() || null,
      });
      onFeedback({ error: null, success: result.message });
    } catch (error) {
      onFeedback({
        error:
          error instanceof ApiClientError
            ? error.message
            : "Could not save profile.",
        success: null,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <CardDescription>
          Update personal details you are allowed to change. Role, permissions,
          and account status are managed by administrators.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">First name</Label>
              <Input
                id="profile-first-name"
                value={form.firstName}
                required
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Last name</Label>
              <Input
                id="profile-last-name"
                value={form.lastName}
                required
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-username">Username</Label>
              <Input
                id="profile-username"
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-designation">Job title</Label>
              <Input
                id="profile-designation"
                value={form.designation}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, designation: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-address">Address</Label>
              <Input
                id="profile-address"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-city">City</Label>
              <Input
                id="profile-city"
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-country">Country</Label>
              <Input
                id="profile-country"
                value={form.country}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, country: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-dob">Date of birth</Label>
              <Input
                id="profile-dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-work-location">Work location</Label>
              <Input
                id="profile-work-location"
                value={form.workLocation}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    workLocation: e.target.value,
                  }))
                }
              />
            </div>
            {profile.employeeProfileId ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-personal-email">Personal email</Label>
                <Input
                  id="profile-personal-email"
                  type="email"
                  value={form.personalEmail}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      personalEmail: e.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              rows={4}
              value={form.bio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bio: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentsSection({
  documents,
  isLoading,
  error,
  onFeedback,
}: {
  documents: Array<{
    id: string;
    type: ProfileDocumentType;
    title: string;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    createdAt: string;
  }>;
  isLoading: boolean;
  error: string | null;
  onFeedback: (value: { error: string | null; success: string | null }) => void;
}) {
  const uploadMutation = useUploadProfileDocumentMutation();
  const deleteMutation = useDeleteProfileDocumentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<ProfileDocumentType>("CNIC");
  const [title, setTitle] = useState("");

  async function onUpload(file: File | undefined) {
    if (!file) return;
    onFeedback({ error: null, success: null });
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        meta: {
          type: docType,
          title: title.trim() || file.name,
        },
      });
      setTitle("");
      onFeedback({ error: null, success: result.message });
    } catch (uploadError) {
      onFeedback({
        error:
          uploadError instanceof ApiClientError
            ? uploadError.message
            : "Document upload failed.",
        success: null,
      });
    }
  }

  async function onDownload(id: string, fileName: string | null) {
    try {
      const blob = await settingsService.downloadProfileDocumentBlob(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || "document";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      onFeedback({
        error:
          downloadError instanceof ApiClientError
            ? downloadError.message
            : "Download failed.",
        success: null,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" aria-hidden="true" />
          Personal documents
        </CardTitle>
        <CardDescription>
          Upload ID cards and personal documents through EliteFlow’s secure file
          storage. Only you can access these files from your profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-lg border border-dashed border-border/80 p-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="doc-type">Document type</Label>
            <select
              id="doc-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={docType}
              onChange={(e) =>
                setDocType(e.target.value as ProfileDocumentType)
              }
            >
              {PROFILE_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              placeholder="e.g. National ID card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              className="sr-only"
              onChange={(event) => {
                void onUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              className="w-full"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" aria-hidden="true" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-border/60 px-4 py-8 text-center">
            <p className="text-sm font-medium">No documents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your ID card or other personal documents to keep them in
              one secure place.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-lg border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.type.replaceAll("_", " ")} ·{" "}
                    {doc.fileName || "file"} · {formatBytes(doc.fileSize)} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onDownload(doc.id, doc.fileName)}
                  >
                    <Download className="mr-2 size-3.5" aria-hidden="true" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      onFeedback({ error: null, success: null });
                      void deleteMutation
                        .mutateAsync(doc.id)
                        .then((result) =>
                          onFeedback({
                            error: null,
                            success: result.message,
                          }),
                        )
                        .catch((deleteError: unknown) =>
                          onFeedback({
                            error:
                              deleteError instanceof ApiClientError
                                ? deleteError.message
                                : "Could not delete document.",
                            success: null,
                          }),
                        );
                    }}
                  >
                    <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SecuritySection({ profile }: { profile: SettingsProfileDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-4" aria-hidden="true" />
          Account security
        </CardTitle>
        <CardDescription>
          Password, MFA, and session controls remain in the Security center.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Two-factor authentication:{" "}
          <span className="font-medium text-foreground">
            {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={ROUTES.SECURITY}>Open security settings</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={ROUTES.SETTINGS_SESSIONS}>Active sessions</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
