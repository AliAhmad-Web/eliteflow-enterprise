import {
  PAYMENTS_API_PREFIX,
  type BankTransferSubmitInput,
  type CreatePaymentRefundInput,
  type DecidePaymentRefundInput,
  type HostedCheckoutDto,
  type InitiateProviderPaymentInput,
  type ListPaymentsQueryInput,
  type PakistanPaymentMethodValue,
  type PaymentDto,
  type PaymentListResponse,
  type PaymentMethodConfigDto,
  type PaymentRefundDto,
  type RejectPaymentInput,
  type UpdatePaymentMethodConfigInput,
  type VerifyPaymentInput,
  type WalletPaymentNoticeInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQueryString(query: ListPaymentsQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.method) params.set("method", query.method);
  if (query.invoiceId) params.set("invoiceId", query.invoiceId);
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.quoteId) params.set("quoteId", query.quoteId);
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const paymentsService = {
  list(query: ListPaymentsQueryInput) {
    return apiRequest<PaymentListResponse>(
      `${PAYMENTS_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<PaymentDto>(`${PAYMENTS_API_PREFIX}/${id}`, {
      auth: true,
    });
  },

  listMethods() {
    return apiRequest<PaymentMethodConfigDto[]>(
      `${PAYMENTS_API_PREFIX}/methods`,
      { auth: true },
    );
  },

  updateMethod(method: PakistanPaymentMethodValue, input: UpdatePaymentMethodConfigInput) {
    return apiRequest<PaymentMethodConfigDto>(
      `${PAYMENTS_API_PREFIX}/methods/${method}`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  submitBankTransfer(input: BankTransferSubmitInput) {
    return apiRequest<PaymentDto>(`${PAYMENTS_API_PREFIX}/bank-transfer`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  submitWalletNotice(input: WalletPaymentNoticeInput) {
    return apiRequest<PaymentDto>(`${PAYMENTS_API_PREFIX}/wallet-notice`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  initiateJazzCash(input: InitiateProviderPaymentInput) {
    return apiRequest<{ payment: PaymentDto; checkout: HostedCheckoutDto }>(
      `${PAYMENTS_API_PREFIX}/jazzcash/initiate`,
      { method: "POST", body: input, auth: true },
    );
  },

  initiateEasyPaisa(input: InitiateProviderPaymentInput) {
    return apiRequest<{ payment: PaymentDto; checkout: HostedCheckoutDto }>(
      `${PAYMENTS_API_PREFIX}/easypaisa/initiate`,
      { method: "POST", body: input, auth: true },
    );
  },

  verify(id: string, input: VerifyPaymentInput = {}) {
    return apiRequest<PaymentDto>(`${PAYMENTS_API_PREFIX}/${id}/verify`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  reject(id: string, input: RejectPaymentInput) {
    return apiRequest<PaymentDto>(`${PAYMENTS_API_PREFIX}/${id}/reject`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  createRefund(id: string, input: CreatePaymentRefundInput) {
    return apiRequest<PaymentRefundDto>(`${PAYMENTS_API_PREFIX}/${id}/refunds`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  decideRefund(id: string, refundId: string, input: DecidePaymentRefundInput) {
    return apiRequest<PaymentRefundDto>(
      `${PAYMENTS_API_PREFIX}/${id}/refunds/${refundId}`,
      { method: "POST", body: input, auth: true },
    );
  },
};
