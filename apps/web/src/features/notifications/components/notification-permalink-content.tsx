"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { use, useEffect, useRef, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import {
  useArchiveNotification,
  useDeleteNotification,
  useMarkNotificationRead,
} from "../hooks/use-notifications-mutations";
import { useNotification } from "../hooks/use-notifications";
import { NotificationDetailPanel } from "./notification-detail-panel";

interface NotificationPermalinkPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Permanent URL: /notifications/{id}
 * Opens the notification detail panel, marks read, and shows related context.
 */
export function NotificationPermalinkContent({
  params,
}: NotificationPermalinkPageProps) {
  const { id } = use(params);
  const canRead = useHasPermission(PERMISSIONS.NOTIFICATIONS_READ);
  const detailQuery = useNotification(id, canRead);
  const markRead = useMarkNotificationRead();
  const archiveOne = useArchiveNotification();
  const deleteOne = useDeleteNotification();
  const [panelOpen, setPanelOpen] = useState(true);
  const markedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!detailQuery.data || detailQuery.data.isRead) return;
    if (markedIdRef.current === detailQuery.data.id) return;
    markedIdRef.current = detailQuery.data.id;
    markRead.mutate(detailQuery.data.id);
  }, [detailQuery.data, markRead]);

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notification" description="Permalink" />
        <ErrorState
          title="Permission denied"
          description="You do not have access to notifications."
        />
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notification" description="Loading…" />
        <LoadingState />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notification" description="Not found" />
        <ErrorState
          title="Notification not found"
          description="This link may be expired or you may not have access."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={detailQuery.data.title}
        description="Opened from a permanent notification link"
      />
      <NotificationDetailPanel
        notification={panelOpen ? detailQuery.data : null}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onMarkRead={(nid) => markRead.mutate(nid)}
        onArchive={(nid) => archiveOne.mutate(nid)}
        onDelete={(nid) => deleteOne.mutate(nid)}
        isMarkingRead={markRead.isPending}
        isArchiving={archiveOne.isPending}
        isDeleting={deleteOne.isPending}
      />
    </div>
  );
}
