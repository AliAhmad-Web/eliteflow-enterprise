"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";

import { useAuth } from "../hooks/use-auth";
import { getPostLoginRedirect } from "../utils/redirect";

interface AuthGuestGuardProps {
  children: React.ReactNode;
}

export function AuthGuestGuard({ children }: AuthGuestGuardProps) {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    const redirectTo = getPostLoginRedirect(
      user.role.code,
      searchParams.get("redirect"),
      { mfaEnrollmentRequired: Boolean(user.mfaEnrollmentRequired) },
    );
    window.location.assign(redirectTo);
  }, [isAuthenticated, isInitialized, searchParams, user]);

  if (!isInitialized) {
    // Instant login form — never block guests on auth bootstrap.
    // If a session exists, the effect below redirects once ready.
    if (!isAuthenticated) {
      return children;
    }
    return null;
  }

  if (isAuthenticated) {
    return (
      <LoadingState
        label="Opening your workspace"
        className="min-h-[320px] border-0 bg-transparent"
      />
    );
  }

  return children;
}
