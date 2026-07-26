"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  clearChunkReloadGuard,
  recoverFromChunkLoadError,
} from "@/lib/chunk-load-recovery";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardSegmentError({
  error,
  reset,
}: SegmentErrorProps) {
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
    <div className="mx-auto w-full max-w-lg py-10">
      <ErrorState
        title="Could not load this page"
        description={
          isChunkError
            ? "A newer version of EliteFlow was deployed. Reloading will load the latest app assets."
            : error.message || "Something went wrong while loading this section."
        }
        retryLabel="Try again"
        onRetry={handleRetry}
      />
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" asChild>
          <a href={ROUTES.HOME}>Go to home</a>
        </Button>
      </div>
    </div>
  );
}
