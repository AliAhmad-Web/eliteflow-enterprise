import type { Metadata } from "next";

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
        <SignupForm />
      </AuthCard>
    </AuthPageShell>
  );
}
