"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/common/feedback/loading-state";

/** Heavy Settings sub-sections — code-split so the default Settings shell stays light. */
export const LazyApiKeysSection = dynamic(
  () =>
    import("./settings-api-backup-sections").then((mod) => ({
      default: mod.ApiKeysSection,
    })),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading API keys" />,
  },
);

export const LazyBackupSection = dynamic(
  () =>
    import("./settings-api-backup-sections").then((mod) => ({
      default: mod.BackupSection,
    })),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading backups" />,
  },
);
