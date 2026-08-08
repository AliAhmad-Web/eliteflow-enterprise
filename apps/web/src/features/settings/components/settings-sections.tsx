"use client";

import type { SettingsOverviewDto } from "@enterprise/shared";
import {
  APP_LANGUAGES,
  BORDER_RADII,
  DASHBOARD_DENSITIES,
  FONT_SIZES,
  SIDEBAR_STYLES,
  THEME_MODES,
} from "@enterprise/shared";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  memo,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { isCommunicationWhatsappPresentationEnabled } from "@/features/communication/feature-flags";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import { LANGUAGE_LABELS } from "../constants/settings-nav";
import { useSettingsMutation } from "../hooks/use-settings";
import { settingsService } from "../services/settings.service";
import type { SettingsSectionId } from "../constants/settings-nav";
import {
  LazyApiKeysSection,
  LazyBackupSection,
} from "./settings-heavy-sections";

/** Matches project-form / notifications select styling (EliteFlow design system). */
const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const checkboxClassName = "h-4 w-4 rounded border-input";

function ToggleRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
      <input
        type="checkbox"
        className={checkboxClassName}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
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
        error ? "text-destructive" : "text-emerald-600",
      )}
    >
      {error ?? success}
    </p>
  );
}

function useSaveState() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  return {
    error,
    success,
    setError,
    setSuccess,
    clear() {
      setError(null);
      setSuccess(null);
    },
    fromError(err: unknown) {
      setSuccess(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Unable to save settings",
      );
    },
  };
}

export const SettingsSectionPanel = memo(function SettingsSectionPanel({
  section,
  data,
}: {
  section: SettingsSectionId;
  data: SettingsOverviewDto;
}) {
  switch (section) {
    case "profile":
      return <ProfileSection data={data} />;
    case "company":
      return data.company ? <CompanySection data={data} /> : null;
    case "appearance":
      return <AppearanceSection data={data} />;
    case "language":
      return <LocaleSection data={data} />;
    case "notifications":
      return <NotificationsSection data={data} />;
    case "ai":
      return <AiSection data={data} />;
    case "security":
      return <SecuritySection data={data} />;
    case "api-keys":
      return <LazyApiKeysSection enabled={data.canManageOrganization} />;
    case "backup":
      return <LazyBackupSection enabled={data.canManageOrganization} />;
    case "storage":
      return data.storage ? <StorageSection data={data} /> : null;
    case "billing":
      return data.billing ? <BillingSection data={data} /> : null;
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
});

const ProfileSection = memo(function ProfileSection({
  data,
}: {
  data: SettingsOverviewDto;
}) {
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateProfile);
  const deletion = useSettingsMutation(settingsService.requestDeletion);
  const [form, setForm] = useState({
    firstName: data.profile.firstName,
    lastName: data.profile.lastName,
    username: data.profile.username ?? "",
    avatarUrl: data.profile.avatarUrl ?? "",
    phone: data.profile.phone ?? "",
    bio: data.profile.bio ?? "",
    designation: data.profile.designation ?? "",
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username || null,
        avatarUrl: form.avatarUrl || null,
        phone: form.phone || null,
        bio: form.bio || null,
        designation: form.designation || null,
      });
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  async function onDeleteRequest() {
    feedback.clear();
    try {
      const result = await deletion.mutateAsync({
        confirmEmail: data.profile.email,
        reason: "User requested account deletion from settings",
      });
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>
          Name, avatar, contact details, and account actions. For the full
          personal profile experience (photo upload and documents), open{" "}
          <Link href={ROUTES.PROFILE} className="underline underline-offset-2">
            My Profile
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={data.profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, designation: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Avatar URL</Label>
            <Input
              value={form.avatarUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, avatarUrl: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-bio">Bio</Label>
            <Textarea
              id="settings-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
          {data.profile.department ? (
            <p className="text-sm text-muted-foreground">
              Department: {data.profile.department}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Two-factor authentication:{" "}
            <span className="font-medium text-foreground">
              {data.profile.twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
          </p>
          <Feedback error={feedback.error} success={feedback.success} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save profile"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={ROUTES.SECURITY}>Change password / 2FA</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={ROUTES.SETTINGS_SESSIONS}>Active sessions</Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletion.isPending}
              onClick={() => void onDeleteRequest()}
            >
              Request account deletion
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const CompanySection = memo(function CompanySection({
  data,
}: {
  data: SettingsOverviewDto;
}) {
  const company = data.company!;
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateCompany);
  const [form, setForm] = useState({
    companyName: company.companyName,
    logoUrl: company.logoUrl ?? "",
    brandColor: company.brandColor ?? "#6366f1",
    website: company.website ?? "",
    addressLine1: company.addressLine1 ?? "",
    city: company.city ?? "",
    country: company.country ?? "",
    taxNumber: company.taxNumber ?? "",
    registrationNumber: company.registrationNumber ?? "",
    currency: company.currency,
    timezone: company.timezone,
    emailFromName: company.emailFromName ?? "",
    emailFromAddress: company.emailFromAddress ?? "",
    emailReplyTo: company.emailReplyTo ?? "",
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync({
        companyName: form.companyName,
        logoUrl: form.logoUrl || null,
        brandColor: form.brandColor || null,
        website: form.website || null,
        addressLine1: form.addressLine1 || null,
        city: form.city || null,
        country: form.country || null,
        taxNumber: form.taxNumber || null,
        registrationNumber: form.registrationNumber || null,
        currency: form.currency,
        timezone: form.timezone,
        emailFromName: form.emailFromName || null,
        emailFromAddress: form.emailFromAddress || null,
        emailReplyTo: form.emailReplyTo || null,
      });
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company & organization</CardTitle>
        <CardDescription>
          Branding, legal details, locale defaults, and outbound email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          {(
            [
              ["companyName", "Company name"],
              ["logoUrl", "Logo URL"],
              ["brandColor", "Brand color"],
              ["website", "Website"],
              ["addressLine1", "Address"],
              ["city", "City"],
              ["country", "Country"],
              ["taxNumber", "Tax number"],
              ["registrationNumber", "Registration number"],
              ["currency", "Currency"],
              ["timezone", "Timezone"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                required={
                  key === "companyName" ||
                  key === "currency" ||
                  key === "timezone"
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2 border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">Email settings</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {(
                [
                  ["emailFromName", "From name"],
                  ["emailFromAddress", "From address"],
                  ["emailReplyTo", "Reply-to"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save company settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const AppearanceSection = memo(function AppearanceSection({ data }: { data: SettingsOverviewDto }) {
  const { setTheme } = useTheme();
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateAppearance);
  const resetMutation = useSettingsMutation(settingsService.resetPreferences);
  const [form, setForm] = useState(data.appearance);

  useEffect(() => {
    setForm(data.appearance);
  }, [data.appearance]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync(form);
      const theme =
        form.themeMode === "LIGHT"
          ? "light"
          : form.themeMode === "DARK"
            ? "dark"
            : "system";
      setTheme(theme);
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Theme, density, sidebar style, and visual preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Theme</Label>
            <select
              className={selectClassName}
              value={form.themeMode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  themeMode: e.target.value as typeof f.themeMode,
                }))
              }
            >
              {THEME_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Sidebar style</Label>
            <select
              className={selectClassName}
              value={form.sidebarStyle}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sidebarStyle: e.target.value as typeof f.sidebarStyle,
                }))
              }
            >
              {SIDEBAR_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Font size</Label>
            <select
              className={selectClassName}
              value={form.fontSize}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fontSize: e.target.value as typeof f.fontSize,
                }))
              }
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Border radius</Label>
            <select
              className={selectClassName}
              value={form.borderRadius}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  borderRadius: e.target.value as typeof f.borderRadius,
                }))
              }
            >
              {BORDER_RADII.map((radius) => (
                <option key={radius} value={radius}>
                  {radius}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Dashboard density</Label>
            <select
              className={selectClassName}
              value={form.dashboardDensity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  dashboardDensity: e.target
                    .value as typeof f.dashboardDensity,
                }))
              }
            >
              {DASHBOARD_DENSITIES.map((density) => (
                <option key={density} value={density}>
                  {density}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Accent color</Label>
            <Input
              value={form.accentColor ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, accentColor: e.target.value || null }))
              }
              placeholder="#6366f1"
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleRow
              checked={form.compactMode}
              onChange={(checked) =>
                setForm((f) => ({ ...f, compactMode: checked }))
              }
            >
              Compact mode
            </ToggleRow>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save appearance"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={resetMutation.isPending}
                onClick={() =>
                  void resetMutation.mutateAsync(undefined).then((r) => {
                    feedback.setSuccess(r.message);
                  })
                }
              >
                Reset preferences
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const LocaleSection = memo(function LocaleSection({ data }: { data: SettingsOverviewDto }) {
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateLocale);
  const [form, setForm] = useState(data.locale);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync(form);
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language & locale</CardTitle>
        <CardDescription>
          Language, timezone, currency, and date/time formats.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Language</Label>
            <select
              className={selectClassName}
              value={form.language}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  language: e.target.value as typeof f.language,
                }))
              }
            >
              {APP_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Date format</Label>
            <Input
              value={form.dateFormat}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateFormat: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Time format</Label>
            <select
              className={selectClassName}
              value={form.timeFormat}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  timeFormat: e.target.value as "12h" | "24h",
                }))
              }
            >
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </select>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <Button type="submit" disabled={mutation.isPending}>
              Save locale
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const NotificationsSection = memo(function NotificationsSection({ data }: { data: SettingsOverviewDto }) {
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateNotifications);
  const [form, setForm] = useState(data.notifications);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync(form);
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  const showWhatsapp = isCommunicationWhatsappPresentationEnabled();
  type NotifToggleKey =
    | "emailNotifications"
    | "pushNotifications"
    | "desktopNotifications"
    | "smsNotifications"
    | "whatsappNotifications";
  const toggles: Array<{ key: NotifToggleKey; label: string }> = [
    { key: "emailNotifications", label: "Email notifications" },
    { key: "pushNotifications", label: "Push notifications" },
    { key: "desktopNotifications", label: "Desktop notifications" },
    { key: "smsNotifications", label: "SMS (future ready)" },
  ];
  if (showWhatsapp) {
    toggles.push({
      key: "whatsappNotifications",
      label: "WhatsApp (future ready)",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Channel delivery for email, push, desktop
          {showWhatsapp ? ", and WhatsApp" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2 lg:grid-cols-2">
            {toggles.map(({ key, label }) => (
              <ToggleRow
                key={key}
                checked={form[key]}
                onChange={(checked) =>
                  setForm((f) => ({ ...f, [key]: checked }))
                }
              >
                {label}
              </ToggleRow>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Category-level preferences remain available in{" "}
            <Link href={ROUTES.NOTIFICATIONS} className="text-primary underline">
              Notifications
            </Link>
            .
          </p>
          <div className="space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save notifications"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const AiSection = memo(function AiSection({ data }: { data: SettingsOverviewDto }) {
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateAi);
  const [form, setForm] = useState({
    aiProvider: data.ai.aiProvider ?? "gemini",
    aiModel: data.ai.aiModel ?? "",
    aiTemperature: data.ai.aiTemperature ?? 0.7,
    aiMaxTokens: data.ai.aiMaxTokens ?? 2048,
    aiHistoryEnabled: data.ai.aiHistoryEnabled,
    aiPrivacyMode: data.ai.aiPrivacyMode,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync({
        aiProvider: form.aiProvider || "gemini",
        aiModel: form.aiModel || null,
        aiTemperature: form.aiTemperature,
        aiMaxTokens: form.aiMaxTokens,
        aiHistoryEnabled: form.aiHistoryEnabled,
        aiPrivacyMode: form.aiPrivacyMode,
      });
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI preferences</CardTitle>
        <CardDescription>
          Gemini is the default provider. OpenAI and Claude are reserved for
          future switching without changing application code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="settings-ai-provider">Default provider</Label>
            <select
              id="settings-ai-provider"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.aiProvider || "gemini"}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiProvider: e.target.value }))
              }
            >
              <option value="gemini">Gemini (default)</option>
              <option value="openai">OpenAI (ready when connected)</option>
              <option value="claude">Claude (future)</option>
              <option value="mock">Mock (development only)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-ai-model">Model</Label>
            <Input
              id="settings-ai-model"
              value={form.aiModel}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiModel: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-ai-temp">Temperature</Label>
            <Input
              id="settings-ai-temp"
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={form.aiTemperature}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  aiTemperature: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-ai-tokens">Max tokens</Label>
            <Input
              id="settings-ai-tokens"
              type="number"
              value={form.aiMaxTokens}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  aiMaxTokens: Number(e.target.value),
                }))
              }
            />
          </div>
          <ToggleRow
            checked={form.aiHistoryEnabled}
            onChange={(checked) =>
              setForm((f) => ({ ...f, aiHistoryEnabled: checked }))
            }
          >
            Keep AI history
          </ToggleRow>
          <ToggleRow
            checked={form.aiPrivacyMode}
            onChange={(checked) =>
              setForm((f) => ({ ...f, aiPrivacyMode: checked }))
            }
          >
            Privacy mode
          </ToggleRow>
          <div className="sm:col-span-2 space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save AI settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const SecuritySection = memo(function SecuritySection({ data }: { data: SettingsOverviewDto }) {
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateSecurity);
  const [form, setForm] = useState({
    twoFactorPreferred: data.security.twoFactorPreferred,
    sessionTimeoutMinutes: data.security.sessionTimeoutMinutes,
    loginAlertsEnabled: data.security.loginAlertsEnabled,
    deviceTrustEnabled: data.security.deviceTrustEnabled,
    passwordPolicyStrict: data.security.passwordPolicyStrict,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await mutation.mutateAsync(form);
      feedback.setSuccess(result.message);
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security preferences</CardTitle>
        <CardDescription>
          Session timeout, login alerts, device trust, and password policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          2FA status:{" "}
          <span className="font-medium text-foreground">
            {data.security.twoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
          . Open the{" "}
          <Link href={ROUTES.SECURITY} className="text-primary underline">
            Security Center
          </Link>{" "}
          for sessions, password change, and audit.
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="settings-session-timeout">
              Session timeout (minutes)
            </Label>
            <Input
              id="settings-session-timeout"
              type="number"
              min={15}
              max={10080}
              value={form.sessionTimeoutMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sessionTimeoutMinutes: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {(
              [
                ["twoFactorPreferred", "Prefer two-factor authentication"],
                ["loginAlertsEnabled", "Login alerts"],
                ["deviceTrustEnabled", "Device trust"],
                ["passwordPolicyStrict", "Strict password policy"],
              ] as const
            ).map(([key, label]) => (
              <ToggleRow
                key={key}
                checked={form[key]}
                onChange={(checked) =>
                  setForm((f) => ({ ...f, [key]: checked }))
                }
              >
                {label}
              </ToggleRow>
            ))}
          </div>
          <div className="space-y-3">
            <Feedback error={feedback.error} success={feedback.success} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving…"
                  : "Save security preferences"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={ROUTES.SETTINGS_SESSIONS}>Session settings</Link>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

const StorageSection = memo(function StorageSection({ data }: { data: SettingsOverviewDto }) {
  const storage = data.storage!;
  const used = Number(storage.usedBytes);
  const quota = Number(storage.quotaBytes) || 1;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>
          Organization storage provider, quota, and current usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Provider:</span>{" "}
          <span className="font-medium">{storage.provider}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Files:</span>{" "}
          <span className="font-medium">{storage.fileCount}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Used:</span>{" "}
          <span className="font-medium">
            {(used / (1024 * 1024)).toFixed(1)} MB /{" "}
            {(quota / (1024 * 1024 * 1024)).toFixed(1)} GB ({pct}%)
          </span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
});

const BillingSection = memo(function BillingSection({ data }: { data: SettingsOverviewDto }) {
  const billing = data.billing!;
  const feedback = useSaveState();
  const mutation = useSettingsMutation(settingsService.updateBilling);
  const [email, setEmail] = useState(billing.billingEmail ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & subscription</CardTitle>
        <CardDescription>
          Current plan, seat usage, AI credits, and billing contact.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 lg:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Plan:</span>{" "}
            <span className="font-medium">
              {billing.planName}
            </span>{" "}
            ({billing.status})
          </p>
          <p>
            <span className="text-muted-foreground">Seats:</span>{" "}
            <span className="font-medium">
              {billing.seatsUsed} / {billing.seatsIncluded}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">AI credits:</span>{" "}
            <span className="font-medium">
              {billing.aiCreditsUsed} / {billing.aiCreditsIncluded}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Period ends:</span>{" "}
            <span className="font-medium">
              {billing.currentPeriodEnd
                ? new Date(billing.currentPeriodEnd).toLocaleDateString()
                : "—"}
            </span>
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            feedback.clear();
            void mutation
              .mutateAsync({ billingEmail: email || null })
              .then((r) => feedback.setSuccess(r.message))
              .catch(feedback.fromError);
          }}
        >
          <div className="min-w-[220px] flex-1 space-y-2">
            <Label>Billing email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            Save
          </Button>
        </form>
        <Feedback error={feedback.error} success={feedback.success} />
        <div>
          <p className="mb-2 font-medium">Payment methods</p>
          <ul className="space-y-1">
            {billing.paymentMethods.map((method) => (
              <li key={method.id}>
                {method.brand} •••• {method.last4}
                {method.isDefault ? " (default)" : ""}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-medium">Billing history</p>
          <ul className="space-y-1">
            {billing.history.map((item) => (
              <li key={item.id}>
                {item.description} — {item.amount} {item.currency} ({item.status})
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});
