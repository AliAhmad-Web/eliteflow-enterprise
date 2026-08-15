"use client";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { useClientWorkspaceAccess } from "@/features/quotes/hooks/use-client-workspace-access";

import { CustomerCommercialCard } from "./customer-commercial-card";

export function ClientWorkspaceLockedState() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
        <p className="font-medium">Advance payment required</p>
        <p className="text-muted-foreground">
          Your project workspace stays locked until EliteFlow verifies the
          required advance payment. You can pay the advance and submit payment
          proof below.
        </p>
      </div>
      <CustomerCommercialCard />
    </div>
  );
}

export function ClientWorkspaceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isClient, unlocked, isLoading } = useClientWorkspaceAccess();

  if (!isClient) return children;
  if (isLoading) {
    return <LoadingState label="Checking project access" className="min-h-60" />;
  }
  if (!unlocked) return <ClientWorkspaceLockedState />;
  return children;
}
