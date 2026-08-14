import {
  INVOICES_API_PREFIX,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceListResponse,
  type InvoicePaymentNoticeInput,
  type InvoiceStats,
  type ListInvoicesQueryInput,
  type UpdateInvoiceInput,
} from "@enterprise/shared";

import { apiRequest, authenticatedFetch } from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

function toQueryString(query: ListInvoicesQueryInput): string {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.projectId) params.set("projectId", query.projectId);
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const invoicesService = {
  list(query: ListInvoicesQueryInput) {
    return apiRequest<InvoiceListResponse>(
      `${INVOICES_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getStats() {
    return apiRequest<InvoiceStats>(`${INVOICES_API_PREFIX}/stats`, {
      auth: true,
    });
  },

  getById(id: string) {
    return apiRequest<Invoice>(`${INVOICES_API_PREFIX}/${id}`, { auth: true });
  },

  create(input: CreateInvoiceInput) {
    return apiRequest<Invoice>(INVOICES_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateInvoiceInput) {
    return apiRequest<Invoice>(`${INVOICES_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  remove(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${INVOICES_API_PREFIX}/${id}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  reportPaymentNotice(id: string, input: InvoicePaymentNoticeInput = {}) {
    return apiRequest<Invoice>(`${INVOICES_API_PREFIX}/${id}/payment-notice`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  issue(id: string) {
    return apiRequest<Invoice>(`${INVOICES_API_PREFIX}/${id}/issue`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  async downloadPdf(id: string): Promise<{ blob: Blob; filename: string }> {
    const response = await authenticatedFetch(
      `${INVOICES_API_PREFIX}/${id}/pdf`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new ApiClientError(
        "Failed to download invoice PDF",
        "INVOICES_PDF_ERROR",
        response.status,
      );
    }

    const disposition = response.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] ?? `invoice-${id}.pdf`;
    const blob = await response.blob();
    return { blob, filename };
  },
};
