"use client";

import {
  EASYPAISA_QR_ACCOUNT_NAME,
  EASYPAISA_QR_IMAGE_PATH,
  EASYPAISA_QR_MSISDN_MASKED,
  JAZZCASH_QR_IMAGE_PATH,
  JAZZCASH_QR_MERCHANT_NAME,
  JAZZCASH_QR_TILL_ID,
  JAZZCASH_QR_USSD,
  PERMISSIONS,
  type Invoice,
  type PakistanPaymentMethodValue,
} from "@enterprise/shared";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { paymentDetailPath } from "@/constants/routes";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { filesService } from "@/features/files/services/files.service";
import { ApiClientError } from "@/services/api/api-error";

import {
  useSubmitBankTransfer,
  useSubmitWalletNotice,
} from "../hooks/use-payment-mutations";
import { usePaymentMethods, usePayments } from "../hooks/use-payments";
import { PAYMENT_METHOD_LABELS } from "../types/payments.types";
import { PaymentStatusBadge } from "./payment-status-badge";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function InvoicePayPanel({
  invoice,
  title = "Pay invoice",
}: {
  invoice: Invoice;
  title?: string;
}) {
  const canPay = useHasPermission(PERMISSIONS.PAYMENTS_PAY);
  const methodsQuery = usePaymentMethods();
  const historyQuery = usePayments({
    invoiceId: invoice.id,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });
  const bankMutation = useSubmitBankTransfer();
  const walletMutation = useSubmitWalletNotice();

  const remaining =
    invoice.remainingAmount ??
    Math.max(0, invoice.total - (invoice.paidAmount ?? 0));
  const paid = invoice.paidAmount ?? 0;
  const fullyPaid = invoice.paymentStatus === "PAID" || remaining <= 0;
  const methods = (methodsQuery.data ?? []).filter((item) => item.enabled);

  const [method, setMethod] = useState<PakistanPaymentMethodValue | "">(
    "",
  );
  const [amount, setAmount] = useState(String(remaining || invoice.total));
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [proofFileId, setProofFileId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selected = methods.find((item) => item.method === method);
  const pending =
    bankMutation.isPending || walletMutation.isPending || uploading;
  const error =
    bankMutation.error instanceof ApiClientError
      ? bankMutation.error
      : walletMutation.error instanceof ApiClientError
        ? walletMutation.error
        : null;

  async function onProofChange(file: File | null) {
    if (!file) {
      setProofFileId(null);
      setProofFileName(null);
      return;
    }
    setUploading(true);
    setFormError(null);
    try {
      // Company-scoped only: the project dashboard is still locked until
      // admin verifies the advance, so do not send projectId here.
      const uploaded = await filesService.uploadFiles({
        files: [file],
        clientId: invoice.clientId,
        tags: ["payment-proof"],
      });
      const id = uploaded[0]?.id;
      if (!id) {
        setProofFileId(null);
        setProofFileName(null);
        setFormError("Screenshot upload did not return a file. Please try again.");
        return;
      }
      setProofFileId(id);
      setProofFileName(file.name);
    } catch (cause) {
      setProofFileId(null);
      setProofFileName(null);
      setFormError(
        cause instanceof ApiClientError
          ? cause.message
          : "Screenshot upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function submitManual() {
    if (!method) return;
    const trimmedReference = reference.trim();
    if (trimmedReference.length < 3) {
      setFormError("Enter a transaction / reference ID of at least 3 characters.");
      return;
    }
    if (!proofFileId) {
      setFormError("Upload a payment screenshot before submitting.");
      return;
    }
    setMessage(null);
    setFormError(null);
    try {
      if (method === "BANK_TRANSFER") {
        await bankMutation.mutateAsync({
          invoiceId: invoice.id,
          amount: Number(amount),
          customerReference: trimmedReference,
          paidAt,
          notes: notes || undefined,
          proofFileId,
        });
        setMessage("Bank transfer submitted. EliteFlow will verify before the invoice is marked paid.");
        setProofOpen(false);
        return;
      }
      await walletMutation.mutateAsync({
        invoiceId: invoice.id,
        method,
        amount: Number(amount),
        customerReference: trimmedReference,
        paidAt,
        notes: notes || undefined,
        proofFileId,
      });
      setMessage(
        method === "JAZZCASH"
          ? "JazzCash QR payment submitted. Admin will verify the transaction ID before the invoice is marked paid."
          : method === "EASYPAISA"
            ? "EasyPaisa QR payment submitted. Admin will verify the Transaction ID before the invoice is marked paid."
            : "Payment submitted for verification. A success screen is not enough — admin confirmation is required.",
      );
      setProofOpen(false);
    } catch (cause) {
      setFormError(
        cause instanceof ApiClientError
          ? cause.message
          : "Payment could not be submitted. Please try again.",
      );
    }
  }

  if (!canPay) {
    return (
      <p className="text-sm text-muted-foreground">
        Payment methods are available after you choose Pay Advance. If they do
        not appear, your account needs payment access.
      </p>
    );
  }

  const jazzTillId = selected?.merchantPublicId || JAZZCASH_QR_TILL_ID;
  const jazzQrSrc = selected?.qrImageUrl || JAZZCASH_QR_IMAGE_PATH;
  const easyMsisdn = selected?.merchantPublicId || EASYPAISA_QR_MSISDN_MASKED;
  const easyQrSrc = selected?.qrImageUrl || EASYPAISA_QR_IMAGE_PATH;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <p>
            <span className="block text-xs uppercase text-muted-foreground">Amount due</span>
            <span className="font-medium tabular-nums">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </p>
          <p>
            <span className="block text-xs uppercase text-muted-foreground">Paid</span>
            <span className="font-medium tabular-nums">
              {formatMoney(paid, invoice.currency)}
            </span>
          </p>
          <p>
            <span className="block text-xs uppercase text-muted-foreground">Remaining</span>
            <span className="font-medium tabular-nums">
              {formatMoney(remaining, invoice.currency)}
            </span>
          </p>
        </div>

        {historyQuery.data?.items.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Payment history</p>
            {historyQuery.data.items.map((item) => (
              <a
                key={item.id}
                href={paymentDetailPath(item.id)}
                className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
              >
                <span>
                  {PAYMENT_METHOD_LABELS[item.method]} · {item.paymentNumber}
                </span>
                <PaymentStatusBadge status={item.status} />
              </a>
            ))}
          </div>
        ) : null}

        {fullyPaid ? (
          <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-700 dark:text-emerald-400">
            This invoice is fully paid.
          </p>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase text-muted-foreground">
                Payment methods
              </legend>
              {methods.map((item) => (
                <label key={item.method} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment-method"
                    value={item.method}
                    checked={method === item.method}
                    onChange={() => setMethod(item.method)}
                  />
                  {item.displayName || PAYMENT_METHOD_LABELS[item.method]}
                </label>
              ))}
            </fieldset>

            {selected?.method === "BANK_TRANSFER" ? (
              <div className="rounded-md border bg-background p-3 text-sm">
                <p><strong>Bank:</strong> {selected.bankName || "Ask your EliteFlow admin"}</p>
                <p><strong>Account title:</strong> {selected.accountTitle || "—"}</p>
                <p><strong>Account number:</strong> {selected.accountNumber || "—"}</p>
                <p><strong>IBAN:</strong> {selected.iban || "—"}</p>
                <p><strong>Invoice:</strong> {invoice.invoiceNumber}</p>
                <p><strong>Amount:</strong> {formatMoney(remaining, invoice.currency)}</p>
                {selected.instructions ? (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {selected.instructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selected?.method === "JAZZCASH" ? (
              <div className="space-y-3 rounded-md border bg-background p-3">
                <p className="font-medium">Pay via JazzCash QR</p>
                <p className="text-muted-foreground">
                  Scan this QR in JazzCash, or dial {JAZZCASH_QR_USSD} and enter Till ID{" "}
                  <span className="font-medium text-foreground">{jazzTillId}</span>. Pay{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(remaining, invoice.currency)}
                  </span>{" "}
                  for invoice {invoice.invoiceNumber}.
                </p>
                <img
                  src={jazzQrSrc}
                  alt={`JazzCash QR for ${JAZZCASH_QR_MERCHANT_NAME}`}
                  className="mx-auto w-full max-w-xs rounded-md border bg-white p-2"
                />
                <p className="text-center text-xs text-muted-foreground">
                  {JAZZCASH_QR_MERCHANT_NAME} · Till ID {jazzTillId}
                </p>
                {selected.instructions ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {selected.instructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selected?.method === "EASYPAISA" ? (
              <div className="space-y-3 rounded-md border bg-background p-3">
                <p className="font-medium">Pay via EasyPaisa QR</p>
                <p className="text-muted-foreground">
                  Scan this QR in EasyPaisa to send money to{" "}
                  <span className="font-medium text-foreground">
                    {EASYPAISA_QR_ACCOUNT_NAME}
                  </span>
                  . Pay{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(remaining, invoice.currency)}
                  </span>{" "}
                  for invoice {invoice.invoiceNumber}, then submit your Transaction ID /
                  Reference ID.
                </p>
                <img
                  src={easyQrSrc}
                  alt={`EasyPaisa QR for ${EASYPAISA_QR_ACCOUNT_NAME}`}
                  className="mx-auto w-full max-w-xs rounded-md border bg-white p-2"
                />
                <p className="text-center text-xs text-muted-foreground">
                  {EASYPAISA_QR_ACCOUNT_NAME} · MSISDN {easyMsisdn}
                </p>
                {selected.instructions ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {selected.instructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selected ? (
              <div className="grid gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setProofOpen(true);
                  }}
                >
                  Enter Transaction ID & Screenshot
                </Button>
                <p className="text-xs text-muted-foreground">
                  Pay using the instructions above, then submit your transaction
                  ID and screenshot. Upload only starts verification — it does
                  not mark the invoice paid.
                </p>
              </div>
            ) : null}
          </>
        )}

        {message ? (
          <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-700 dark:text-emerald-400" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </CardContent>
      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Payment</DialogTitle>
            <DialogDescription>
              Enter the transaction details and upload a screenshot. EliteFlow
              verifies the payment before the invoice is marked paid.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Payment method</p>
              <p className="font-medium">
                {method ? PAYMENT_METHOD_LABELS[method] : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Required advance amount
              </p>
              <p className="font-medium">
                {formatMoney(remaining || invoice.total, invoice.currency)}
              </p>
            </div>
            <label className="grid gap-1">
              <span>Amount paid</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span>Transaction / Reference ID</span>
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Required"
              />
            </label>
            <label className="grid gap-1">
              <span>Upload Payment Screenshot</span>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) =>
                  void onProofChange(event.target.files?.[0] ?? null)
                }
              />
              {proofFileName ? (
                <span className="text-xs text-muted-foreground">{proofFileName}</span>
              ) : uploading ? (
                <span className="text-xs text-muted-foreground">Uploading screenshot…</span>
              ) : null}
            </label>
            {formError ? (
              <p className="text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProofOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !reference.trim() || !proofFileId}
              onClick={() => void submitManual()}
            >
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
