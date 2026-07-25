"use client";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardSegmentError({
  error,
  reset,
}: SegmentErrorProps) {
  return (
    <div className="mx-auto w-full max-w-lg py-10">
      <ErrorState
        title="Could not load this page"
        description={
          error.message || "Something went wrong while loading this section."
        }
        retryLabel="Try again"
        onRetry={reset}
      />
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" asChild>
          <a href={ROUTES.HOME}>Go to home</a>
        </Button>
      </div>
    </div>
  );
}
