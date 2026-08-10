export type SettingsSectionId =
  | "profile"
  | "company"
  | "appearance"
  | "language"
  | "notifications"
  | "ai"
  | "security"
  | "api-keys"
  | "backup"
  | "storage"
  | "billing";

export interface SettingsNavItem {
  id: SettingsSectionId;
  title: string;
  description: string;
  orgOnly?: boolean;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Name, avatar, contact details",
  },
  {
    id: "company",
    title: "Company",
    description: "Organization branding and legal",
    orgOnly: true,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme, density, and layout",
  },
  {
    id: "language",
    title: "Language & Locale",
    description: "Language, timezone, currency",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email, push, and channel prefs",
  },
  {
    id: "ai",
    title: "AI Preferences",
    description: "Provider, model, privacy",
  },
  {
    id: "security",
    title: "Security",
    description: "2FA prefs, sessions, alerts",
  },
  {
    id: "api-keys",
    title: "API Keys",
    description: "Encrypted integration secrets",
    orgOnly: true,
  },
  {
    id: "backup",
    title: "Backup",
    description: "Metadata snapshots and history (not full DB dumps)",
    orgOnly: true,
  },
  {
    id: "storage",
    title: "Storage",
    description: "Quota and usage",
    orgOnly: true,
  },
  {
    id: "billing",
    title: "Billing",
    description: "Plan, usage, and invoices",
    orgOnly: true,
  },
];

export const LANGUAGE_LABELS: Record<"EN" | "UR" | "AR", string> = {
  EN: "English",
  UR: "Urdu",
  AR: "Arabic",
};
