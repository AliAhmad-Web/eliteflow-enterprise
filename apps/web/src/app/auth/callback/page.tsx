import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { OAuthCallbackHandler } from "@/features/auth/components/oauth-callback-handler";
import { isSeoRobotsEnabled } from "@/features/seo/feature-flags";
import { composePrivateSurfaceMetadata } from "@/features/seo/metadata/compose-public-page-metadata";

const CALLBACK_BASELINE: Metadata = {
  title: "OAuth callback",
};

export const metadata: Metadata = composePrivateSurfaceMetadata(
  CALLBACK_BASELINE,
  isSeoRobotsEnabled(),
);

/** Runs before React hydration so Supabase/Next cannot wipe redirect tokens first. */
const OAUTH_CAPTURE_SCRIPT = `
(function () {
  try {
    var h = location.hash || "";
    var s = location.search || "";
    if (
      h.indexOf("access_token") >= 0 ||
      s.indexOf("code=") >= 0 ||
      h.indexOf("error") >= 0 ||
      s.indexOf("error=") >= 0
    ) {
      sessionStorage.setItem(
        "eliteflow.oauth.redirect",
        JSON.stringify({ hash: h, search: s, href: location.href, ts: Date.now() })
      );
    }
  } catch (e) {}
})();
`;

export default function OAuthCallbackPage() {
  return (
    <>
      <script
        // Inline capture must run before client bundles strip the redirect URL.
        dangerouslySetInnerHTML={{ __html: OAUTH_CAPTURE_SCRIPT }}
      />
      <Suspense
        fallback={
          <AuthPageShell>
            <AuthCard
              title="Completing sign-in"
              description="Verifying your OAuth identity"
            >
              <LoadingState
                label="Signing you in securely"
                className="min-h-50 border-0 bg-transparent"
              />
            </AuthCard>
          </AuthPageShell>
        }
      >
        <OAuthCallbackHandler />
      </Suspense>
    </>
  );
}
