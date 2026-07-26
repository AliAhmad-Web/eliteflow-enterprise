"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  clearChunkReloadGuard,
  recoverFromChunkLoadError,
} from "@/lib/chunk-load-recovery";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (recoverFromChunkLoadError(error)) return;
    clearChunkReloadGuard();
  }, [error]);

  const isChunkError = /Loading chunk [\w-]+ failed/i.test(error.message);

  const handleRetry = () => {
    if (isChunkError) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-4">
        <ErrorState
          title="Something went wrong"
          description={
            isChunkError
              ? "A newer version of EliteFlow was deployed. Reloading will load the latest app assets."
              : error.message ||
                "An unexpected error occurred. You can try again or return home."
          }
          retryLabel="Try again"
          onRetry={handleRetry}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" asChild>
            <a href={ROUTES.HOME}>Go to home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
