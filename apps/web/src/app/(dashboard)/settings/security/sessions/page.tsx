import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";

const ActiveSessionsPanel = dynamic(
  () =>
    import("@/features/auth/components/active-sessions-panel").then(
      (m) => m.ActiveSessionsPanel,
    ),
  { loading: () => null },
);

export const metadata: Metadata = { title: "Active Sessions" };

export default function ActiveSessionsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.SETTINGS} className="hover:text-foreground">
          Settings
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={ROUTES.SETTINGS_SECURITY} className="hover:text-foreground">
          Security
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Active Sessions</span>
      </p>
      <ActiveSessionsPanel />
    </div>
  );
}
