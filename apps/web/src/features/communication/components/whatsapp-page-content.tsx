"use client";

import { UserRole } from "@enterprise/shared";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useNotificationQueue } from "@/features/notifications/hooks/use-notifications";
import { formatRelativeTime } from "@/features/notifications/types/notifications.types";

import { isCommunicationWhatsappPageEnabled } from "../feature-flags";
import {
  formatProviderStatusBadge,
  getWhatsappProviderInfo,
} from "../utils/provider-status";

/**
 * Communication → WhatsApp entry. Reuses NotificationQueue WHATSAPP channel.
 * Sidebar visibility is gated by COMMUNICATION_WHATSAPP_PAGE (default OFF).
 */
export function WhatsappPageContent() {
  const enabled = isCommunicationWhatsappPageEnabled();
  const provider = getWhatsappProviderInfo();
  const role = useAuthStore((s) => s.user?.role?.code);
  const isAdmin =
    role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const queueQuery = useNotificationQueue(
    { page: 1, pageSize: 12, channel: "WHATSAPP" },
    enabled && isAdmin,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Meta WhatsApp Business messaging via the existing notification queue."
      />
      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          This standalone page is hidden. Set{" "}
          <code className="text-xs">NEXT_PUBLIC_COMMUNICATION_WHATSAPP_PAGE=true</code>{" "}
          to show it in the sidebar again. Email Automation remains the primary
          outbound channel — see{" "}
          <Link href={ROUTES.EMAIL_AUTOMATION} className="underline">
            Email Automation
          </Link>
          .
        </p>
      ) : (
        <section className="space-y-3 rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium text-foreground">Provider Status</span>
            <Badge
              variant={provider.status === "ready" ? "success" : "warning"}
            >
              {provider.status === "ready"
                ? "Connected"
                : formatProviderStatusBadge(provider.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{provider.message}</p>
          {isAdmin ? (
            <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2 text-xs">
              <p className="font-medium text-foreground">Recent WhatsApp queue</p>
              {queueQuery.isLoading ? (
                <p className="mt-1 text-muted-foreground">Loading…</p>
              ) : (queueQuery.data?.items.length ?? 0) === 0 ? (
                <p className="mt-1 text-muted-foreground">
                  No WHATSAPP queue items yet.
                </p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {(queueQuery.data?.items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap justify-between gap-2 rounded border border-border/40 px-2 py-1"
                    >
                      <span>
                        {item.toAddress ?? "—"} · {item.status}
                      </span>
                      <span className="text-muted-foreground">
                        {formatRelativeTime(item.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Organization admins can view WhatsApp queue status.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
