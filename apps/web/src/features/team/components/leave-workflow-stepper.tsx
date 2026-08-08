"use client";

import type {
  LeaveRequest,
  LeaveWorkflowStateValue,
} from "@enterprise/shared";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export const LEAVE_WORKFLOW_STAGE_LABELS: Record<
  LeaveWorkflowStateValue,
  string
> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  MANAGER_APPROVED: "Manager approved",
  MANAGER_REJECTED: "Manager rejected",
  HR_APPROVED: "HR approved",
  HR_REJECTED: "HR rejected",
  FINAL_APPROVED: "Fully approved",
  FINAL_REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const PIPELINE: LeaveWorkflowStateValue[] = [
  "SUBMITTED",
  "MANAGER_APPROVED",
  "HR_APPROVED",
  "FINAL_APPROVED",
];

function resolveCurrentState(leave: LeaveRequest): LeaveWorkflowStateValue {
  if (leave.workflowState) return leave.workflowState;
  if (leave.status === "APPROVED") return "FINAL_APPROVED";
  if (leave.status === "REJECTED") return "FINAL_REJECTED";
  if (leave.status === "CANCELLED") return "CANCELLED";
  return "SUBMITTED";
}

export function getLeaveWorkflowActionCopy(leave: LeaveRequest): {
  approveLabel: string;
  rejectLabel: string;
  stageHint: string;
} {
  const state = resolveCurrentState(leave);
  switch (state) {
    case "SUBMITTED":
      return {
        approveLabel: "Approve (Manager)",
        rejectLabel: "Reject (Manager)",
        stageHint: "Awaiting manager approval.",
      };
    case "MANAGER_APPROVED":
      return {
        approveLabel: "Approve (HR)",
        rejectLabel: "Reject (HR)",
        stageHint: "Manager approved — awaiting HR review.",
      };
    case "HR_APPROVED":
      return {
        approveLabel: "Final approve",
        rejectLabel: "Final reject",
        stageHint: "HR approved — awaiting final confirmation.",
      };
    default:
      return {
        approveLabel: "Approve",
        rejectLabel: "Reject",
        stageHint: LEAVE_WORKFLOW_STAGE_LABELS[state],
      };
  }
}

function stageStatus(
  step: LeaveWorkflowStateValue,
  current: LeaveWorkflowStateValue,
): "completed" | "current" | "pending" | "rejected" {
  if (
    current === "MANAGER_REJECTED" ||
    current === "HR_REJECTED" ||
    current === "FINAL_REJECTED" ||
    current === "CANCELLED" ||
    current === "EXPIRED"
  ) {
    const rejectAt =
      current === "MANAGER_REJECTED"
        ? "SUBMITTED"
        : current === "HR_REJECTED"
          ? "MANAGER_APPROVED"
          : "HR_APPROVED";
    const rejectIdx = PIPELINE.indexOf(rejectAt);
    const stepIdx = PIPELINE.indexOf(step);
    if (stepIdx < rejectIdx) return "completed";
    if (stepIdx === rejectIdx) return "rejected";
    return "pending";
  }

  const currentIdx = PIPELINE.indexOf(
    current === "FINAL_APPROVED" ? "FINAL_APPROVED" : current,
  );
  const stepIdx = PIPELINE.indexOf(step);
  if (currentIdx < 0) return "pending";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) {
    return current === "FINAL_APPROVED" ? "completed" : "current";
  }
  return "pending";
}

export function LeaveWorkflowStepper({
  leave,
  className,
}: {
  leave: LeaveRequest;
  className?: string;
}) {
  const current = resolveCurrentState(leave);
  const workflow = leave.workflow;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {PIPELINE.map((step, index) => {
          const status = stageStatus(step, current);
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  status === "completed" &&
                    "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  status === "current" &&
                    "border-primary/50 bg-primary/10 text-primary",
                  status === "rejected" &&
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  status === "pending" &&
                    "border-border bg-muted/40 text-muted-foreground",
                )}
                aria-label={`${LEAVE_WORKFLOW_STAGE_LABELS[step]} — ${status}`}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                ) : status === "rejected" ? (
                  <XCircle className="size-4" aria-hidden="true" />
                ) : (
                  <Circle className="size-3.5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {index === 0
                    ? "Submitted"
                    : index === 1
                      ? "Manager"
                      : index === 2
                        ? "HR"
                        : "Final"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground capitalize">
                  {status}
                </p>
              </div>
              {index < PIPELINE.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 hidden h-px flex-1 sm:block",
                    status === "completed" ? "bg-emerald-500/40" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <p>
          Current stage:{" "}
          <span className="font-medium text-foreground">
            {LEAVE_WORKFLOW_STAGE_LABELS[current]}
          </span>
        </p>
        {workflow?.expiresAt && leave.status === "PENDING" ? (
          <p className="mt-1">Expires: {new Date(workflow.expiresAt).toLocaleString()}</p>
        ) : null}
        {workflow?.managerApprovedAt ? (
          <p className="mt-1">
            Manager approved: {new Date(workflow.managerApprovedAt).toLocaleString()}
          </p>
        ) : null}
        {workflow?.hrApprovedAt ? (
          <p className="mt-1">
            HR approved: {new Date(workflow.hrApprovedAt).toLocaleString()}
          </p>
        ) : null}
        {workflow?.finalApprovedAt ? (
          <p className="mt-1">
            Finalized: {new Date(workflow.finalApprovedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
