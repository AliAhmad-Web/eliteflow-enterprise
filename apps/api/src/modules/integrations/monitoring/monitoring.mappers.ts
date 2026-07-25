import type { SyncHistory } from "@enterprise/database";
import type { SyncQueueJobDto } from "@enterprise/shared";

import { mapSyncHistoryDto } from "../integrations.mapper.js";

type SyncHistoryRow = SyncHistory & {
  integration?: { name: string } | null;
};

export function toDisplaySyncStatus(
  status: SyncHistory["status"],
): SyncQueueJobDto["displayStatus"] {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "RUNNING":
      return "Running";
    case "SUCCESS":
      return "Completed";
    case "PARTIAL":
      return "Partial";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapSyncQueueJobDto(row: SyncHistoryRow): SyncQueueJobDto {
  const base = mapSyncHistoryDto(row);
  return {
    ...base,
    displayStatus: toDisplaySyncStatus(row.status),
  };
}
