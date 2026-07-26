import type { Metadata } from "next";
import { Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
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
      <div className="mt-6 flex justify-center">
        <Button asChild variant="outline" size="lg">
          <Link href={ROUTES.DOWNLOADS}>
            <Download className="size-4" aria-hidden="true" />
            Download EliteFlow
          </Link>
        </Button>
      </div>
    </AuthPageShell>
  );
}
