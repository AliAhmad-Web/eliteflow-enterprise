"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES, invoiceDetailPath } from "@/constants/routes";
import { useFileDetail } from "@/features/files/hooks/use-files";
import { filesService } from "@/features/files/services/files.service";
import { fileViewerPath } from "@/features/files/components/file-viewer/file-viewer.utils";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreatePaymentRefund,
  useDecidePaymentRefund,
  useRejectPayment,
  useVerifyPayment,
} from "../hooks/use-payment-mutations";
import { usePayment } from "../hooks/use-payments";
import { PAYMENT_METHOD_LABELS } from "../types/payments.types";
import { PaymentStatusBadge } from "./payment-status-badge";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

function PaymentProofPreview({ fileId }: { fileId: string }) {
  const fileQuery = useFileDetail(fileId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void filesService
      .downloadBlob(fileId, "preview")
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPreviewError(
          error instanceof ApiClientError
            ? error.message
            : "Could not load payment proof",
        );
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  const mime = fileQuery.data?.mimeType ?? "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase text-muted-foreground">
        Uploaded payment proof
      </p>
      {fileQuery.data ? (
        <p className="text-sm">{fileQuery.data.originalName}</p>
      ) : null}
      {previewError ? (
        <p className="text-sm text-destructive">{previewError}</p>
      ) : null}
      {previewUrl && isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Payment proof"
          className="max-h-96 rounded-md border"
        />
      ) : null}
      {previewUrl && isPdf ? (
        <iframe title="Payment proof" src={previewUrl} className="h-96 w-full rounded-md border" />
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link href={fileViewerPath(fileId)}>Open in File Manager</Link>
      </Button>
    </div>
  );
}

export function PaymentDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const paymentId = params.id;
  const { isAdmin } = useRole();
  const hasVerify = useHasPermission(PERMISSIONS.PAYMENTS_VERIFY);
  const hasRefund = useHasPermission(PERMISSIONS.PAYMENTS_REFUND);
  const canVerify = isAdmin && hasVerify;
  const canRefund = isAdmin && hasRefund;
  const paymentQuery = usePayment(paymentId);
  const verifyMutation = useVerifyPayment();
  const rejectMutation = useRejectPayment();
  const refundMutation = useCreatePaymentRefund();
  const decideRefund = useDecidePaymentRefund();
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const payment = paymentQuery.data;
  if (paymentQuery.isLoading) return <LoadingState label="Loading payment" />;
  if (paymentQuery.isError || !payment) {
    return (
      <ErrorState
        title="Could not load payment"
        onRetry={() => void paymentQuery.refetch()}
      />
    );
  }

  const error =
    verifyMutation.error instanceof ApiClientError
      ? verifyMutation.error
      : rejectMutation.error instanceof ApiClientError
        ? rejectMutation.error
        : refundMutation.error instanceof ApiClientError
          ? refundMutation.error
          : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.paymentNumber}
        description={`${PAYMENT_METHOD_LABELS[payment.method]} · ${payment.invoiceNumber ?? "Invoice"}`}
      />
      <Button variant="ghost" size="sm" asChild>
        <Link href={ROUTES.PAYMENTS}>
          <ArrowLeft className="mr-2 size-4" />
          Back to payments
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Status: <PaymentStatusBadge status={payment.status} /></p>
            <p>Amount: {formatMoney(payment.amount, payment.currency)}</p>
            <p>Customer: {payment.clientName ?? "—"}</p>
            <p>Project: {payment.projectName ?? "—"}</p>
            {payment.invoiceKind === "ADVANCE" ? (
              <p>
                Required advance:{" "}
                {formatMoney(payment.invoiceTotal ?? payment.amount, payment.currency)}
              </p>
            ) : null}
            <p>
              Submitted amount: {formatMoney(payment.amount, payment.currency)}
            </p>
            <p>Quote: {payment.quoteNumber ?? "—"}</p>
            <p>
              Invoice:{" "}
              <Link className="underline" href={invoiceDetailPath(payment.invoiceId)}>
                {payment.invoiceNumber ?? payment.invoiceId}
              </Link>
            </p>
            <p>
              Transaction / Reference ID:{" "}
              {payment.customerReference || payment.providerTxnId || "—"}
            </p>
            <p>Payment method: {PAYMENT_METHOD_LABELS[payment.method]}</p>
            <p>Submitted: {payment.submittedAt ? new Date(payment.submittedAt).toLocaleString() : "—"}</p>
            <p>Verified by: {payment.verifiedByName || "—"}</p>
            <p>Verified at: {payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : "—"}</p>
            {payment.proofFileId ? (
              <PaymentProofPreview fileId={payment.proofFileId} />
            ) : (
              <p className="text-muted-foreground">No payment screenshot uploaded.</p>
            )}
            {payment.notes ? <p>Notes: {payment.notes}</p> : null}
            {payment.rejectionReason ? (
              <p className="text-destructive">Rejected: {payment.rejectionReason}</p>
            ) : null}
            {payment.failureReason ? (
              <p className="text-destructive">Failed: {payment.failureReason}</p>
            ) : null}
            <p>
              Invoice paid {formatMoney(payment.invoicePaidAmount ?? 0, payment.currency)} of{" "}
              {formatMoney(payment.invoiceTotal ?? 0, payment.currency)} · remaining{" "}
              {formatMoney(payment.invoiceRemainingAmount ?? 0, payment.currency)}
            </p>
          </CardContent>
        </Card>

        {canVerify && payment.status === "PENDING_VERIFICATION" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Verification notes"
              />
              <p className="text-xs text-muted-foreground">
                Confirm the money in the actual bank or wallet account before
                verifying. A screenshot alone does not mark the invoice paid.
              </p>
              <Button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  void verifyMutation.mutateAsync({
                    id: payment.id,
                    input: { notes: notes || undefined },
                  })
                }
              >
                Verify Payment
              </Button>
              <p className="text-xs text-muted-foreground">
                Confirm Payment Received after you have checked the actual
                bank or wallet account.
              </p>
              <Input
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Rejection reason"
              />
              <Button
                type="button"
                variant="destructive"
                disabled={rejectMutation.isPending || rejectReason.trim().length < 3}
                onClick={() =>
                  void rejectMutation.mutateAsync({
                    id: payment.id,
                    input: { reason: rejectReason },
                  })
                }
              >
                Reject payment
              </Button>
              {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {canRefund && (payment.status === "VERIFIED" || payment.status === "PAID") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                placeholder="Refund amount"
              />
              <Input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Refund reason"
              />
              <Button
                type="button"
                variant="outline"
                disabled={refundMutation.isPending || !refundAmount || refundReason.trim().length < 3}
                onClick={() =>
                  void refundMutation.mutateAsync({
                    id: payment.id,
                    input: { amount: Number(refundAmount), reason: refundReason },
                  })
                }
              >
                Record refund request
              </Button>
              {(payment.refunds ?? []).map((refund) => (
                <div key={refund.id} className="rounded-md border p-2 text-sm">
                  <p>
                    {refund.refundNumber} · {formatMoney(refund.amount, payment.currency)} · {refund.status}
                  </p>
                  {refund.status === "PENDING" ? (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          void decideRefund.mutateAsync({
                            id: payment.id,
                            refundId: refund.id,
                            input: { decision: "APPROVE" },
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void decideRefund.mutateAsync({
                            id: payment.id,
                            refundId: refund.id,
                            input: { decision: "REJECT" },
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
