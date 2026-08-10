import {
  INVOICES_API_PREFIX,
  type Invoice,
  type InvoiceListResponse,
  type InvoicePaymentNoticeInput,
  type InvoiceStats,
  type ListInvoicesQueryInput,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export const invoicesService = {
  list(query: ListInvoicesQueryInput) {
    return apiRequest<InvoiceListResponse>(
      `${INVOICES_API_PREFIX}${toQueryString({
        search: query.search || undefined,
        status: query.status,
        clientId: query.clientId,
        projectId: query.projectId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        limit: query.limit,
      })}`,
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

  reportPaymentNotice(id: string, input: InvoicePaymentNoticeInput = {}) {
    return apiRequest<Invoice>(`${INVOICES_API_PREFIX}/${id}/payment-notice`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },
};
