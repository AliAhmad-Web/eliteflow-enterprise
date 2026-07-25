import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthGuestGuard } from "@/features/auth/components/auth-guest-guard";

export const metadata: Metadata = {
  title: "Authentication",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(109,40,217,0.14),transparent_55%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(139,92,246,0.16),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.06),transparent_40%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <Suspense
          fallback={
            <LoadingState label="Loading" className="min-h-[320px] border-0 bg-transparent" />
          }
        >
          <AuthGuestGuard>{children}</AuthGuestGuard>
        </Suspense>
      </div>
    </div>
  );
}
