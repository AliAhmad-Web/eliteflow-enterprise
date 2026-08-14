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

export function InvoicePayPanel({ invoice }: { invoice: Invoice }) {
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
  const [message, setMessage] = useState<string | null>(null);

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
      return;
    }
    setUploading(true);
    try {
      const uploaded = await filesService.uploadFiles({
        files: [file],
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        tags: ["payment-proof"],
      });
      const id = uploaded[0]?.id;
      if (id) setProofFileId(id);
    } finally {
      setUploading(false);
    }
  }

  async function submitManual() {
    if (!method) return;
    setMessage(null);
    if (method === "BANK_TRANSFER") {
      await bankMutation.mutateAsync({
        invoiceId: invoice.id,
        amount: Number(amount),
        customerReference: reference,
        paidAt,
        notes: notes || undefined,
        proofFileId: proofFileId ?? undefined,
      });
      setMessage("Bank transfer submitted. EliteFlow will verify before the invoice is marked paid.");
      return;
    }
    await walletMutation.mutateAsync({
      invoiceId: invoice.id,
      method,
      amount: Number(amount),
      customerReference: reference,
      paidAt,
      notes: notes || undefined,
      proofFileId: proofFileId ?? undefined,
    });
    setMessage(
      method === "JAZZCASH"
        ? "JazzCash QR payment submitted. Admin will verify the transaction ID before the invoice is marked paid."
        : method === "EASYPAISA"
          ? "EasyPaisa QR payment submitted. Admin will verify the Transaction ID before the invoice is marked paid."
          : "Payment submitted for verification. A success screen is not enough — admin confirmation is required.",
    );
  }

  if (!canPay) return null;

  const jazzTillId = selected?.merchantPublicId || JAZZCASH_QR_TILL_ID;
  const jazzQrSrc = selected?.qrImageUrl || JAZZCASH_QR_IMAGE_PATH;
  const easyMsisdn = selected?.merchantPublicId || EASYPAISA_QR_MSISDN_MASKED;
  const easyQrSrc = selected?.qrImageUrl || EASYPAISA_QR_IMAGE_PATH;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Pay invoice</CardTitle>
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
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount paid"
                />
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder={
                    method === "JAZZCASH"
                      ? "JazzCash transaction / reference ID"
                      : method === "EASYPAISA"
                        ? "EasyPaisa Transaction ID / Reference ID"
                        : "Transaction / reference number"
                  }
                />
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                />
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => void onProofChange(event.target.files?.[0] ?? null)}
                />
                <Button type="button" disabled={pending || !reference} onClick={() => void submitManual()}>
                  Submit for verification
                </Button>
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
    </Card>
  );
}
