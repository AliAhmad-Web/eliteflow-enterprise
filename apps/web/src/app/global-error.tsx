"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-full bg-background font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg space-y-4">
            <ErrorState
              title="Something went wrong"
              description={
                error.message ||
                "An unexpected error occurred. You can try again or return home."
              }
              retryLabel="Try again"
              onRetry={reset}
            />
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" asChild>
                <a href={ROUTES.HOME}>Go to home</a>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
