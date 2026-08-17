"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function SentryProbeClient() {
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    const error = new Error("EliteFlow Sentry production probe");
    error.name = "SentryProductionProbeError";
    const id = Sentry.captureException(error, {
      tags: {
        eliteflow_probe: "sentry",
        source: "web",
      },
    });
    setEventId(id);
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">Sentry probe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Controlled production exception captured. This page is only reachable
        when NEXT_PUBLIC_SENTRY_PROBE is enabled.
      </p>
      <p className="mt-4 font-mono text-sm">eventId: {eventId ?? "pending"}</p>
    </main>
  );
}
