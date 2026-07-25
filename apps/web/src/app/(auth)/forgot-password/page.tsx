import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Forgot password"
        description="Enter your email and we will send you a reset link"
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthPageShell>
  );
}
