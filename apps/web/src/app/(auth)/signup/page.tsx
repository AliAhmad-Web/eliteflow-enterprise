import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Create account" description="Get started with your enterprise workspace">
        <Suspense
          fallback={
            <LoadingState
              label="Loading sign up"
              className="min-h-[280px] border-0 bg-transparent"
            />
          }
        >
          <SignupForm />
        </Suspense>
      </AuthCard>
    </AuthPageShell>
  );
}
