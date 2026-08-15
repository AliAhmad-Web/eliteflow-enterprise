"use client";

import type {
  CreateCustomerRequestInput,
  CustomerRequestDto,
  UpdateCustomerRequestInput,
} from "@enterprise/shared";
import {
  CUSTOMER_REQUEST_INTAKE_TYPES,
  PERMISSIONS,
  isCustomerRequestContinuationType,
} from "@enterprise/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FolderKanban, LayoutDashboard, Send, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES, continuationRequestNewPath, quoteDetailPath, taskDetailPath } from "@/constants/routes";
import { AUTH_QUERY_KEYS } from "@/features/auth/types/auth.types";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { CustomerCommercialCard } from "@/features/quotes/components/customer-commercial-card";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { useQuotes } from "@/features/quotes/hooks/use-quotes";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { getApiErrorMessage } from "@/services/api/api-error";

import {
  useSubmitCustomerRequest,
  useUpdateCustomerRequest,
  useWithdrawCustomerRequest,
} from "../hooks/use-customer-request-mutations";
import { useCustomerRequest } from "../hooks/use-customer-requests";
import {
  CUSTOMER_REQUEST_PRIORITY_LABELS,
  CUSTOMER_REQUEST_TYPE_LABELS,
} from "../types/query-keys";
import { ClarificationHistoryList } from "./clarification-history";
import { CustomerRequestStatusBadge } from "./customer-request-status-badge";
import { RequestForm } from "./request-form";
import { RequestLifecycleSteps } from "./request-lifecycle-steps";

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

function canEditRequest(request: CustomerRequestDto) {
  return (
    request.status === "DRAFT" || request.status === "CLARIFICATION_REQUESTED"
  );
}

function canSubmitRequest(request: CustomerRequestDto) {
  return (
    request.status === "DRAFT" || request.status === "CLARIFICATION_REQUESTED"
  );
}

function canWithdrawRequest(request: CustomerRequestDto) {
  return (
    request.status === "SUBMITTED" ||
    request.status === "CLARIFICATION_REQUESTED" ||
    request.status === "CUSTOMER_RESPONDED"
  );
}

export function RequestDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const canCreate = useHasPermission(PERMISSIONS.CUSTOMER_REQUESTS_CREATE);
  const queryClient = useQueryClient();

  const requestQuery = useCustomerRequest(requestId);
  const quotesQuery = useQuotes(
    {
      search: "",
      customerRequestId: requestId,
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    },
    { refetchInterval: 8_000 },
  );
  const projectsQuery = useProjects({
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  });

  const updateMutation = useUpdateCustomerRequest();
  const submitMutation = useSubmitCustomerRequest();
  const withdrawMutation = useWithdrawCustomerRequest();
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const request = requestQuery.data;

  useEffect(() => {
    setResponseText(request?.clarificationResponse ?? "");
  }, [request?.id, request?.clarificationResponse]);

  useEffect(() => {
    if (
      request?.status === "APPROVED" ||
      request?.status === "CONVERTED"
    ) {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    }
  }, [queryClient, request?.id, request?.status]);

  const handleUpdate = async (values: CreateCustomerRequestInput) => {
    if (!requestId) return;
    setActionError(null);
    const input: UpdateCustomerRequestInput = {
      type: values.type,
      title: values.title,
      description: values.description,
      requirements: values.requirements,
      preferredDeadline: values.preferredDeadline,
      currency: values.currency,
      priority: values.priority,
      additionalNotes: values.additionalNotes,
      targetProjectId: values.targetProjectId,
      ...(request?.status === "DRAFT"
        ? { expectedBudget: values.expectedBudget }
        : {}),
    };
    try {
      await updateMutation.mutateAsync({ id: requestId, input });
      setEditing(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    if (!requestId) return;
    setActionError(null);
    try {
      await submitMutation.mutateAsync(requestId);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const saveClarificationResponse = async () => {
    if (!requestId) return false;
    const reply = responseText.trim();
    if (!reply) {
      setActionError("Write your response...");
      return false;
    }
    await updateMutation.mutateAsync({
      id: requestId,
      input: { clarificationResponse: reply },
    });
    return true;
  };

  const handleSaveResponse = async () => {
    if (!requestId) return;
    setActionError(null);
    try {
      const saved = await saveClarificationResponse();
      if (!saved) return;
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleResubmitWithResponse = async () => {
    if (!requestId) return;
    setActionError(null);
    try {
      const saved = await saveClarificationResponse();
      if (!saved) return;
      await submitMutation.mutateAsync(requestId);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleWithdraw = async () => {
    if (!requestId) return;
    setActionError(null);
    try {
      await withdrawMutation.mutateAsync(requestId);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  if (requestQuery.isLoading) {
    return <LoadingState label="Loading request" />;
  }

  if (requestQuery.isError || !request) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.REQUESTS}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to requests
          </Link>
        </Button>
        <ErrorState
          title="Could not load request"
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

  const editable = canCreate && canEditRequest(request);
  const busy =
    updateMutation.isPending ||
    submitMutation.isPending ||
    withdrawMutation.isPending;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={ROUTES.REQUESTS}>
          <ArrowLeft className="mr-2 size-4" aria-hidden />
          Back to requests
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={request.title}
          description={CUSTOMER_REQUEST_TYPE_LABELS[request.type]}
        />
        <div className="flex flex-wrap gap-2">
          {editable && !editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null}
          {canCreate &&
          canSubmitRequest(request) &&
          request.status !== "CLARIFICATION_REQUESTED" &&
          !editing ? (
            <Button type="button" disabled={busy} onClick={() => void handleSubmit()}>
              <Send className="mr-2 size-4" aria-hidden />
              Submit
            </Button>
          ) : null}
          {canCreate && canWithdrawRequest(request) ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleWithdraw()}
            >
              <Undo2 className="mr-2 size-4" aria-hidden />
              Withdraw
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CustomerRequestStatusBadge status={request.status} />
        <span className="text-xs text-muted-foreground">
          Priority: {CUSTOMER_REQUEST_PRIORITY_LABELS[request.priority]}
        </span>
      </div>

      <RequestLifecycleSteps status={request.status} />

      {request.status === "APPROVED" || request.status === "CONVERTED" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isCustomerRequestContinuationType(request.type)
                ? "Change request approved"
                : "Project Approved — Advance Payment Required"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground/90">
              {isCustomerRequestContinuationType(request.type)
                ? `EliteFlow approved this ${CUSTOMER_REQUEST_TYPE_LABELS[request.type].toLowerCase()} against ${request.targetProjectName ?? "your project"}. This is not financial or invoice approval.`
                : "EliteFlow accepted this request. Complete the required advance payment below to start the project. The project dashboard stays locked until that payment is verified."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                label="Original expected budget"
                value={formatMoney(request.expectedBudget, request.currency)}
              />
              {!isCustomerRequestContinuationType(request.type) ? (
                <DetailItem
                  label="Agreed deal amount"
                  value={formatMoney(
                    request.commercialAmount ?? request.agreedAmount,
                    request.currency,
                  )}
                />
              ) : (
                <DetailItem
                  label="Expected budget (not commercially approved)"
                  value={formatMoney(request.expectedBudget, request.currency)}
                />
              )}
              <DetailItem
                label="Deadline"
                value={
                  request.preferredDeadline
                    ? new Date(request.preferredDeadline).toLocaleDateString()
                    : "—"
                }
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next steps
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Review the accepted scope and files on this request.</li>
                <li>
                  Pay the required advance and submit payment proof. EliteFlow
                  verifies the payment before the project starts.
                </li>
              </ul>
            </div>
            {!isCustomerRequestContinuationType(request.type) ? (
              <CustomerCommercialCard customerRequestId={request.id} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={ROUTES.PORTAL}>
                  <LayoutDashboard className="mr-2 size-4" aria-hidden />
                  Open dashboard
                </Link>
              </Button>
              {request.convertedProjectId || request.targetProjectId ? (
                <Button asChild variant="secondary">
                  <Link
                    href={`${ROUTES.PROJECTS}?open=${request.convertedProjectId ?? request.targetProjectId}`}
                  >
                    <FolderKanban className="mr-2 size-4" aria-hidden />
                    View project
                  </Link>
                </Button>
              ) : null}
              {request.convertedProjectId &&
              canCreate &&
              !isCustomerRequestContinuationType(request.type) ? (
                <Button asChild variant="outline">
                  <Link
                    href={continuationRequestNewPath(
                      request.convertedProjectId,
                      "REVISION",
                    )}
                  >
                    Request change
                  </Link>
                </Button>
              ) : null}
              {request.convertedTaskId ? (
                <Button asChild variant="outline">
                  <Link href={taskDetailPath(request.convertedTaskId)}>
                    View task
                  </Link>
                </Button>
              ) : null}
            </div>
            {quotesQuery.data?.items.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quotes
                </p>
                {quotesQuery.data.items.map((quote) => (
                  <Link
                    key={quote.id}
                    href={quoteDetailPath(quote.id)}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <span>
                      {quote.quoteNumber} · {formatMoney(quote.total, quote.currency)}
                    </span>
                    <QuoteStatusBadge status={quote.status} />
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {request.status === "CLARIFICATION_REQUESTED" &&
      request.clarificationMessage ? (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clarification requested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {request.clarificationMessage}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Reply below, update your request if needed, then resubmit.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {request.clarificationHistory &&
      request.clarificationHistory.length > 0 &&
      request.status !== "CLARIFICATION_REQUESTED" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clarification history</CardTitle>
          </CardHeader>
          <CardContent>
            <ClarificationHistoryList history={request.clarificationHistory} />
          </CardContent>
        </Card>
      ) : null}

      {canCreate && request.status === "CLARIFICATION_REQUESTED" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response to Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clarification-response">Write your response</Label>
              <Textarea
                id="clarification-response"
                rows={5}
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Write your response..."
                disabled={busy || editing}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || editing}
                onClick={() => void handleSaveResponse()}
              >
                Update Request
              </Button>
              <Button
                type="button"
                disabled={busy || editing}
                onClick={() => void handleResubmitWithResponse()}
              >
                <Send className="mr-2 size-4" aria-hidden />
                Resubmit Request
              </Button>
            </div>
            {request.clarificationHistory &&
            request.clarificationHistory.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Previous clarification
                </p>
                <ClarificationHistoryList
                  history={request.clarificationHistory}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {request.rejectionReason ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rejection reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{request.rejectionReason}</p>
          </CardContent>
        </Card>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {editing ? (
        <Card className="border-border/50 shadow-(--shadow-sm)">
          <CardContent className="p-6">
            <RequestForm
              mode="edit"
              requestId={request.id}
              initialValues={request}
              allowedTypes={
                isCustomerRequestContinuationType(request.type)
                  ? [request.type]
                  : CUSTOMER_REQUEST_INTAKE_TYPES
              }
              lockedProject={
                request.targetProjectId && request.targetProjectName
                  ? {
                      id: request.targetProjectId,
                      name: request.targetProjectName,
                    }
                  : null
              }
              projects={projectsQuery.data?.items ?? []}
              isSubmitting={updateMutation.isPending}
              onSubmit={async (values) => {
                await handleUpdate(values);
              }}
              onCancel={() => {
                setEditing(false);
                setActionError(null);
              }}
            />
          </CardContent>
        </Card>
      ) : (
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
                  <CardTitle className="text-base">Additional notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">
                    {request.additionalNotes}
                  </p>
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
                  label="Updated"
                  value={new Date(request.updatedAt).toLocaleString()}
                />
                {request.convertedProjectId || request.convertedTaskId ? (
                  <>
                    <DetailItem
                      label="Converted project"
                      value={request.convertedProjectId ?? "—"}
                    />
                    <DetailItem
                      label="Converted task"
                      value={request.convertedTaskId ?? "—"}
                    />
                  </>
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
      )}
    </div>
  );
}
