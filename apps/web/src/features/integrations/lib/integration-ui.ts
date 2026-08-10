import type { IntegrationDto } from "@enterprise/shared";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Cloud,
  CreditCard,
  Database,
  Github,
  Mail,
  Sparkles,
  Wand2,
} from "lucide-react";

export const INTEGRATION_LOGO_MAP: Record<
  string,
  { icon: LucideIcon; accent: string }
> = {
  gmail: { icon: Mail, accent: "text-red-600 bg-red-500/10" },
  google_calendar: { icon: Calendar, accent: "text-blue-600 bg-blue-500/10" },
  github: { icon: Github, accent: "text-foreground bg-muted" },
  openai: { icon: Sparkles, accent: "text-emerald-600 bg-emerald-500/10" },
  gemini: { icon: Sparkles, accent: "text-amber-700 bg-amber-500/10" },
  stripe: { icon: CreditCard, accent: "text-indigo-600 bg-indigo-500/10" },
  cloudinary: { icon: Cloud, accent: "text-sky-600 bg-sky-500/10" },
  supabase: { icon: Database, accent: "text-green-700 bg-green-500/10" },
  resend: { icon: Wand2, accent: "text-rose-600 bg-rose-500/10" },
};

export function getIntegrationLogo(integration: Pick<IntegrationDto, "logoKey" | "slug">) {
  return (
    INTEGRATION_LOGO_MAP[integration.logoKey] ??
    INTEGRATION_LOGO_MAP[integration.slug] ?? {
      icon: Cloud,
      accent: "text-muted-foreground bg-muted",
    }
  );
}

export function formatIntegrationWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function formatConnectionDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function connectionBadgeVariant(
  connected: boolean,
): "success" | "secondary" {
  return connected ? "success" : "secondary";
}

/** Honest connection label — never imply full product readiness for PLACEHOLDER. */
export function connectionStatusLabel(
  integration: Pick<IntegrationDto, "isConnected" | "implementationStatus">,
): string {
  const status = integration.implementationStatus ?? "PLACEHOLDER";
  if (status === "PLACEHOLDER") {
    return integration.isConnected
      ? "Configured (architecture only)"
      : "Not configured";
  }
  if (status === "PARTIAL") {
    return integration.isConnected ? "Connected (partial)" : "Not Connected";
  }
  return integration.isConnected ? "Connected" : "Not Connected";
}

export function implementationStatusLabel(
  status: IntegrationDto["implementationStatus"] | undefined,
): string {
  switch (status) {
    case "REAL":
      return "Real";
    case "PARTIAL":
      return "Partial";
    case "PLACEHOLDER":
    default:
      return "Architecture only";
  }
}

export function healthBadgeVariant(
  status: IntegrationDto["healthStatus"],
): "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "HEALTHY":
      return "success";
    case "DEGRADED":
      return "warning";
    case "UNHEALTHY":
      return "destructive";
    case "UNKNOWN":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusBadgeVariant(
  status: IntegrationDto["status"],
): "success" | "secondary" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "AVAILABLE":
      return "outline";
    case "DISCONNECTED":
      return "secondary";
    case "ERROR":
      return "destructive";
    case "DISABLED":
      return "warning";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
