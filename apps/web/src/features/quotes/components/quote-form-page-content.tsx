"use client";

import {
  PAYMENT_MODEL_LABELS,
  PAYMENT_SCHEDULE_KIND_LABELS,
  calculatePaymentSchedule,
  type CreateQuoteInput,
  type PaymentModelValue,
  type PaymentScheduleInput,
} from "@enterprise/shared";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES, quoteDetailPath } from "@/constants/routes";
import { useCustomerRequest } from "@/features/customer-requests/hooks/use-customer-requests";
import { useProject } from "@/features/projects/hooks/use-projects";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { ApiClientError } from "@/services/api/api-error";

import { useCreateQuote } from "../hooks/use-quote-mutations";
import { PAYMENT_MODEL_OPTIONS } from "../types/quotes.types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function QuoteFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const projectId = searchParams.get("projectId");
  const requestQuery = useCustomerRequest(requestId);
  const projectQuery = useProject(projectId);
  const createMutation = useCreateQuote();

  const request = requestQuery.data;
  const project = projectQuery.data;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [paymentModel, setPaymentModel] =
    useState<PaymentModelValue>("SPLIT_30_70");
  const [issueDate, setIssueDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(plusDays(14));
  const [customRows, setCustomRows] = useState<PaymentScheduleInput[]>([
    { kind: "ADVANCE", label: "Advance payment (30%)", percent: 30 },
    { kind: "MILESTONE", label: "Milestone 1", percent: 25 },
    { kind: "MILESTONE", label: "Milestone 2", percent: 25 },
    { kind: "FINAL", label: "Final payment", percent: 20 },
  ]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (request) {
      setTitle(request.title);
      setDescription(request.description ?? "");
      setDealAmount(
        request.agreedAmount != null ? String(request.agreedAmount) : "",
      );
      setInitialized(true);
      return;
    }
    if (project && !requestId) {
      setTitle(project.name);
      setDescription(project.description ?? "");
      setInitialized(true);
    }
  }, [initialized, request, project, requestId]);

  const needsCustom =
    paymentModel === "MILESTONE" || paymentModel === "CUSTOM";
  const preview = useMemo(() => {
    const amount = Number(dealAmount);
    if (!Number.isFinite(amount) || amount <= 0) return [];
    try {
      return calculatePaymentSchedule({
        dealAmount: amount,
        paymentModel,
        customItems: needsCustom ? customRows : undefined,
      });
    } catch {
      return [];
    }
  }, [dealAmount, paymentModel, needsCustom, customRows]);

  const sourceReady = Boolean(requestId ? request : project);
  const sourceLoading = requestId
    ? requestQuery.isLoading
    : Boolean(projectId) && projectQuery.isLoading;

  async function onSubmit() {
    const payload: CreateQuoteInput = {
      customerRequestId: requestId ?? undefined,
      projectId: projectId ?? request?.convertedProjectId ?? undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      issueDate,
      expiryDate,
      currency: request?.currency ?? "USD",
      taxRate: 0,
      discountAmount: "",
      dealAmount,
      paymentModel,
      schedule: needsCustom ? customRows : undefined,
    };
    const created = await createMutation.mutateAsync(payload);
    router.push(quoteDetailPath(created.id));
  }

  if (!requestId && !projectId) {
    return (
      <ErrorState
        title="Select an approved request or project"
        description="Open an approved work request and choose Create quote. EliteFlow fills in the customer and project automatically."
      />
    );
  }

  if (sourceLoading) {
    return <LoadingState label="Loading commercial source" />;
  }

  if (!sourceReady) {
    return (
      <ErrorState
        title="Could not load request or project"
        onRetry={() => {
          void requestQuery.refetch();
          void projectQuery.refetch();
        }}
      />
    );
  }

  const currency = request?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create quote"
        description="Set the agreed deal amount and payment model. The customer's original requested budget stays historical only."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quote details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">
                {request?.clientName ?? project?.clientName ?? "Linked customer"}
              </span>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium">
                {request?.targetProjectName ?? project?.name ?? "Linked project"}
              </span>
            </div>
            {request ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">
                  Original requested budget (historical)
                </p>
                <p>{formatMoney(request.expectedBudget, currency)}</p>
                <p className="mt-2 text-muted-foreground">
                  Current agreed amount on the request
                </p>
                <p className="font-medium">
                  {formatMoney(request.agreedAmount, currency)}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="quote-title">Title</Label>
              <Input
                id="quote-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-deal">Agreed deal amount</Label>
              <Input
                id="quote-deal"
                inputMode="decimal"
                value={dealAmount}
                onChange={(event) => setDealAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is the commercial amount. It must not use the original
                requested budget unless that is the actual agreed deal.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-model">Payment model</Label>
              <select
                id="quote-model"
                className={FORM_SELECT_CLASS}
                value={paymentModel}
                onChange={(event) =>
                  setPaymentModel(event.target.value as PaymentModelValue)
                }
              >
                {PAYMENT_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {needsCustom ? (
              <div className="space-y-3">
                <Label>Custom / milestone schedule</Label>
                {customRows.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_120px_100px]"
                  >
                    <Input
                      value={row.label}
                      onChange={(event) => {
                        const next = [...customRows];
                        next[index] = { ...row, label: event.target.value };
                        setCustomRows(next);
                      }}
                    />
                    <select
                      className={FORM_SELECT_CLASS}
                      value={row.kind}
                      onChange={(event) => {
                        const next = [...customRows];
                        next[index] = {
                          ...row,
                          kind: event.target.value as PaymentScheduleInput["kind"],
                        };
                        setCustomRows(next);
                      }}
                    >
                      {Object.entries(PAYMENT_SCHEDULE_KIND_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                    <Input
                      inputMode="decimal"
                      value={row.percent ?? ""}
                      onChange={(event) => {
                        const next = [...customRows];
                        next[index] = {
                          ...row,
                          percent: Number(event.target.value),
                        };
                        setCustomRows(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quote-issue">Issue date</Label>
                <Input
                  id="quote-issue"
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-expiry">Expiry date</Label>
                <Input
                  id="quote-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-notes">Notes</Label>
              <textarea
                id="quote-notes"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            {createMutation.error instanceof ApiClientError ? (
              <p className="text-sm text-destructive" role="alert">
                {createMutation.error.message}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={createMutation.isPending || !title.trim() || !dealAmount}
                onClick={() => void onSubmit()}
              >
                Save draft quote
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(ROUTES.QUOTES)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment schedule preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {PAYMENT_MODEL_LABELS[paymentModel]} on{" "}
              {formatMoney(Number(dealAmount) || 0, currency)}
            </p>
            {preview.length === 0 ? (
              <p className="text-muted-foreground">
                Enter a deal amount to calculate the schedule.
              </p>
            ) : (
              <ul className="space-y-2">
                {preview.map((item) => (
                  <li
                    key={`${item.label}-${item.sortOrder}`}
                    className="flex justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
                  >
                    <span>
                      {item.label}
                      <span className="ml-2 text-muted-foreground">
                        {item.percent}%
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatMoney(item.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
