import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Welcome back" description="Sign in to your enterprise workspace">
        <Suspense
          fallback={<LoadingState label="Loading sign in" className="min-h-[280px] border-0 bg-transparent" />}
        >
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthPageShell>
  );
}
