import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { OAuthCallbackHandler } from "@/features/auth/components/oauth-callback-handler";

export const metadata: Metadata = {
  title: "OAuth callback",
};

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell>
          <AuthCard title="Completing sign-in" description="Verifying your OAuth identity">
            <LoadingState
              label="Signing you in securely"
              className="min-h-[200px] border-0 bg-transparent"
            />
          </AuthCard>
        </AuthPageShell>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
