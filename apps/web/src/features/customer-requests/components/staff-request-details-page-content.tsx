"use client";

import type { ConvertCustomerRequestInput } from "@enterprise/shared";
import { PERMISSIONS, isCustomerRequestContinuationType } from "@enterprise/shared";
import { ArrowLeft, Check, MessageSquareWarning, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ROUTES,
  taskDetailPath,
} from "@/constants/routes";
import {
  useProjectAssignees,
  useProjects,
} from "@/features/projects/hooks/use-projects";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { getApiErrorMessage } from "@/services/api/api-error";

import {
  useApproveCustomerRequest,
  useClarifyCustomerRequest,
  useConvertCustomerRequest,
  useRejectCustomerRequest,
  useStartCustomerRequestReview,
} from "../hooks/use-customer-request-mutations";
import { useCustomerRequest } from "../hooks/use-customer-requests";
import {
  CUSTOMER_REQUEST_PRIORITY_LABELS,
  CUSTOMER_REQUEST_TYPE_LABELS,
} from "../types/query-keys";
import { ClarificationHistoryList } from "./clarification-history";
import { CustomerRequestStatusBadge } from "./customer-request-status-badge";
import { RequestLifecycleSteps } from "./request-lifecycle-steps";

function isReviewOpen(status: string) {
  return (
    status === "SUBMITTED" ||
    status === "UNDER_REVIEW" ||
    status === "CUSTOMER_RESPONDED"
  );
}

const selectClassName = FORM_SELECT_CLASS_MD;

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

function formatMoney(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function StaffRequestDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const canReview = useHasPermission(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW);

  const requestQuery = useCustomerRequest(requestId);
  const request = requestQuery.data;

  const projectsQuery = useProjects({
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    page: 1,
    limit: 100,
    clientId: request?.clientId ?? undefined,
  });
  const assigneesQuery = useProjectAssignees(canReview);

  const reviewMutation = useStartCustomerRequestReview();
  const clarifyMutation = useClarifyCustomerRequest();
  const approveMutation = useApproveCustomerRequest();
  const rejectMutation = useRejectCustomerRequest();
  const convertMutation = useConvertCustomerRequest();

  const [staffNotes, setStaffNotes] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [clarificationMessage, setClarificationMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [createProject, setCreateProject] = useState(true);
  const [createTask, setCreateTask] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    if (request.type === "NEW_TASK") {
      setCreateProject(false);
      setCreateTask(true);
      setProjectId(request.targetProjectId ?? "");
    } else if (request.type === "NEW_PROJECT") {
      setCreateProject(true);
      setCreateTask(false);
    } else {
      setCreateProject(true);
      setCreateTask(false);
    }
  }, [request?.id, request?.type, request?.targetProjectId]);

  useEffect(() => {
    if (request?.agreedAmount != null) {
      setAgreedAmount(String(request.agreedAmount));
    }
  }, [request?.id, request?.agreedAmount]);

  const busy =
    reviewMutation.isPending ||
    clarifyMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    convertMutation.isPending;

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await action();
      setActionSuccess(successMessage);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  if (requestQuery.isLoading) {
    return <LoadingState label="Loading work request" />;
  }

  if (requestQuery.isError || !request) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.CUSTOMER_REQUESTS}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to work requests
          </Link>
        </Button>
        <ErrorState
          title="Could not load work request"
          description={
            requestQuery.error instanceof Error
              ? requestQuery.error.message
              : "This request may have been removed or you lack access."
          }
          onRetry={() => void requestQuery.refetch()}
        />
      </div>
    );
  }

  const continuation = isCustomerRequestContinuationType(request.type);
  const reviewOpen = isReviewOpen(request.status);

  const handleConvert = async () => {
    const input: ConvertCustomerRequestInput = {
      createProject,
      createTask,
      projectId: projectId || null,
      assignedToId: assignedToId || null,
      staffNotes: staffNotes || null,
    };
    await runAction(
      () => convertMutation.mutateAsync({ id: request.id, input }),
      "Request converted successfully.",
    );
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={ROUTES.CUSTOMER_REQUESTS}>
          <ArrowLeft className="mr-2 size-4" aria-hidden />
          Back to work requests
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={request.title}
          description={`${request.createdByName ?? "Customer"} · ${CUSTOMER_REQUEST_TYPE_LABELS[request.type]}`}
        />
        <CustomerRequestStatusBadge status={request.status} />
      </div>

      <RequestLifecycleSteps status={request.status} />

      {request.status === "APPROVED" || request.status === "CONVERTED" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {continuation
                ? "Change request approved"
                : "Project approved and accepted"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/90">
            This request is associated with{" "}
            {request.createdByName ?? "the submitting customer"}
            {request.createdByEmail ? ` (${request.createdByEmail})` : ""}.
            {continuation ? (
              <>
                {" "}
                It remains linked to{" "}
                {request.targetProjectName ?? "the existing project"}. Expected
                budget:{" "}
                {formatMoney(request.expectedBudget, request.currency)}. Work
                approval is not financial or invoice approval.
              </>
            ) : (
              <>
                {" "}
                Their workspace is active. Original expected budget:{" "}
                {formatMoney(request.expectedBudget, request.currency)}. Agreed
                deal amount:{" "}
                {formatMoney(
                  request.commercialAmount ?? request.agreedAmount,
                  request.currency,
                )}
                .
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm text-emerald-600" role="status">
          {actionSuccess}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {request.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {request.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              {request.requirements ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {request.requirements}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No requirements listed.
                </p>
              )}
            </CardContent>
          </Card>

          {request.additionalNotes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {request.additionalNotes}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {request.clarificationMessage ? (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle className="text-base">
                  Clarification message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {request.clarificationMessage}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {request.clarificationResponse ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Customer response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {request.clarificationResponse}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {request.clarificationHistory &&
          request.clarificationHistory.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Clarification history
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClarificationHistoryList
                  history={request.clarificationHistory}
                />
              </CardContent>
            </Card>
          ) : null}

          {request.rejectionReason ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base">Rejection reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {request.rejectionReason}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {canReview ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Review</CardTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  Customer submits → clarification if needed →{" "}
                  {continuation
                    ? "approve the change against the existing project."
                    : "Approve & Accept Project. The submitting customer is associated automatically — no company picker."}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="staff-notes">Staff notes (optional)</Label>
                  <Textarea
                    id="staff-notes"
                    rows={3}
                    value={staffNotes}
                    onChange={(event) => setStaffNotes(event.target.value)}
                  />
                </div>

                {reviewOpen && !continuation ? (
                  <div className="space-y-2">
                    <Label htmlFor="agreed-amount">
                      Final agreed amount
                    </Label>
                    <Input
                      id="agreed-amount"
                      inputMode="decimal"
                      placeholder="1000.00"
                      value={agreedAmount}
                      onChange={(event) => setAgreedAmount(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Original expected budget stays{" "}
                      {formatMoney(request.expectedBudget, request.currency)}.
                      This agreed amount is the commercial figure used for the
                      project and billing.
                    </p>
                  </div>
                ) : null}

                {reviewOpen && continuation ? (
                  <p className="text-xs text-muted-foreground">
                    Approving this change keeps it on{" "}
                    {request.targetProjectName ?? "the existing project"}. It
                    does not create a new project and is not financial or
                    invoice approval.
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {(request.status === "SUBMITTED" ||
                    request.status === "CUSTOMER_RESPONDED") && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void runAction(
                          () =>
                            reviewMutation.mutateAsync({
                              id: request.id,
                              input: { staffNotes: staffNotes || null },
                            }),
                          "Review started.",
                        )
                      }
                    >
                      Start Review
                    </Button>
                  )}

                  {reviewOpen && (
                    <Button
                      type="button"
                      disabled={
                        busy || (!continuation && !agreedAmount.trim())
                      }
                      onClick={() =>
                        void runAction(
                          () =>
                            approveMutation.mutateAsync({
                              id: request.id,
                              input: {
                                agreedAmount: continuation
                                  ? agreedAmount.trim() || null
                                  : agreedAmount.trim(),
                                staffNotes: staffNotes || null,
                              },
                            }),
                          continuation
                            ? "Change request approved and linked to the existing project."
                            : "Project approved and accepted. Customer workspace is now active.",
                        )
                      }
                    >
                      <Check className="mr-2 size-4" aria-hidden />
                      {continuation
                        ? request.type === "REOPEN_PROJECT"
                          ? "Approve reopen"
                          : "Approve change"
                        : "Approve & Accept Project"}
                    </Button>
                  )}
                </div>

                {reviewOpen && (
                <div className="space-y-3 rounded-xl border border-border/50 p-4">
                  <Label htmlFor="clarify-message">Request clarification</Label>
                  <Textarea
                    id="clarify-message"
                    rows={3}
                    value={clarificationMessage}
                    onChange={(event) =>
                      setClarificationMessage(event.target.value)
                    }
                    placeholder="Please provide the expected delivery timeline and preferred technology stack."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !clarificationMessage.trim()}
                    onClick={() =>
                      void runAction(
                        () =>
                          clarifyMutation.mutateAsync({
                            id: request.id,
                            input: {
                              message: clarificationMessage.trim(),
                              staffNotes: staffNotes || null,
                            },
                          }),
                        "Clarification requested.",
                      )
                    }
                  >
                    <MessageSquareWarning className="mr-2 size-4" aria-hidden />
                    Request Clarification
                  </Button>
                </div>
                )}

                {reviewOpen && (
                <div className="space-y-3 rounded-xl border border-destructive/20 p-4">
                  <Label htmlFor="reject-reason">Reject request</Label>
                  <Textarea
                    id="reject-reason"
                    rows={3}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Reason for rejection"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy || !rejectionReason.trim()}
                    onClick={() =>
                      void runAction(
                        () =>
                          rejectMutation.mutateAsync({
                            id: request.id,
                            input: {
                              reason: rejectionReason.trim(),
                              staffNotes: staffNotes || null,
                            },
                          }),
                        "Request rejected.",
                      )
                    }
                  >
                    <X className="mr-2 size-4" aria-hidden />
                    Reject Request
                  </Button>
                </div>
                )}

                {request.status === "APPROVED" && !continuation ? (
                  <div className="space-y-4 rounded-xl border border-border/50 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Convert to delivery work
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional fallback if automatic accept did not create
                        delivery work. The submitting customer is associated
                        automatically — no company picker.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border"
                        checked={createProject}
                        onChange={(event) =>
                          setCreateProject(event.target.checked)
                        }
                      />
                      Create project
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border"
                        checked={createTask}
                        onChange={(event) =>
                          setCreateTask(event.target.checked)
                        }
                      />
                      Create task
                    </label>

                    {createTask && !createProject ? (
                      <div className="space-y-2">
                        <Label htmlFor="convert-project">Project</Label>
                        <select
                          id="convert-project"
                          className={selectClassName}
                          value={projectId}
                          onChange={(event) => setProjectId(event.target.value)}
                        >
                          <option value="">Select project…</option>
                          {(projectsQuery.data?.items ?? []).map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {createTask ? (
                      <div className="space-y-2">
                        <Label htmlFor="convert-assignee">
                          Assign task to (optional)
                        </Label>
                        <select
                          id="convert-assignee"
                          className={selectClassName}
                          value={assignedToId}
                          onChange={(event) =>
                            setAssignedToId(event.target.value)
                          }
                        >
                          <option value="">Unassigned</option>
                          {(assigneesQuery.data ?? []).map((assignee) => (
                            <option key={assignee.id} value={assignee.id}>
                              {assignee.firstName} {assignee.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="convert-notes">
                        Conversion notes (optional)
                      </Label>
                      <Input
                        id="convert-notes"
                        value={staffNotes}
                        onChange={(event) => setStaffNotes(event.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={busy || (!createProject && !createTask)}
                      onClick={() => void handleConvert()}
                    >
                      Convert
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailItem
                label="Priority"
                value={CUSTOMER_REQUEST_PRIORITY_LABELS[request.priority]}
              />
              <DetailItem
                label="Customer"
                value={request.createdByName ?? "—"}
              />
              <DetailItem
                label="Customer email"
                value={request.createdByEmail ?? "—"}
              />
              <DetailItem
                label="Preferred deadline"
                value={
                  request.preferredDeadline
                    ? new Date(request.preferredDeadline).toLocaleDateString()
                    : "—"
                }
              />
                <DetailItem
                  label="Original expected budget"
                  value={formatMoney(request.expectedBudget, request.currency)}
                />
                <DetailItem
                  label="Agreed deal amount"
                  value={formatMoney(
                    request.agreedAmount ?? request.commercialAmount,
                    request.currency,
                  )}
                />
              <DetailItem
                label="Target project"
                value={request.targetProjectName ?? "—"}
              />
              {request.parentRequestTitle ? (
                <DetailItem
                  label="Original request"
                  value={request.parentRequestTitle}
                />
              ) : null}
              <DetailItem
                label="Submitted"
                value={
                  request.submittedAt
                    ? new Date(request.submittedAt).toLocaleString()
                    : "—"
                }
              />
              <DetailItem
                label="Reviewed by"
                value={request.reviewedByName ?? "—"}
              />
              <DetailItem
                label="Reviewed at"
                value={
                  request.reviewedAt
                    ? new Date(request.reviewedAt).toLocaleString()
                    : "—"
                }
              />
              {request.staffNotes ? (
                <DetailItem label="Staff notes" value={request.staffNotes} />
              ) : null}
              {request.convertedProjectId ? (
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Converted project
                  </p>
                  <Link
                    href={`${ROUTES.PROJECTS}?open=${request.convertedProjectId}`}
                    className="mt-1 block text-sm font-medium text-primary hover:underline"
                  >
                    View project
                  </Link>
                </div>
              ) : null}
              {request.convertedTaskId ? (
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Converted task
                  </p>
                  <Link
                    href={taskDetailPath(request.convertedTaskId)}
                    className="mt-1 block text-sm font-medium text-primary hover:underline"
                  >
                    View task
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {request.attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {request.attachments.map((attachment) => (
                    <li key={attachment.id} className="truncate">
                      {attachment.fileName}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
