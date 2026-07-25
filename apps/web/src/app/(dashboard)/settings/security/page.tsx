import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MonitorSmartphone, Shield } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Security Settings" };

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href={ROUTES.SETTINGS} className="hover:text-foreground">
            Settings
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Security</span>
        </p>
        <PageHeader
          title="Security"
          description="Protect your account with session and device controls."
        />
      </div>

      <Link href={ROUTES.SETTINGS_SESSIONS} className="group block">
        <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <div className="icon-box icon-box-md rounded-lg bg-primary/10 text-primary">
                <MonitorSmartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  See where you are signed in, rename devices, and revoke access
                  remotely.
                </CardDescription>
              </div>
            </div>
            <ChevronRight
              className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </CardHeader>
        </Card>
      </Link>

      <Link href={ROUTES.SECURITY} className="group block">
        <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <div className="icon-box icon-box-md rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <CardTitle>Security Center</CardTitle>
                <CardDescription>
                  Review security score, login history, alerts, and change your
                  password with reuse prevention.
                </CardDescription>
              </div>
            </div>
            <ChevronRight
              className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
