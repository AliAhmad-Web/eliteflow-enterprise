import {
  QUOTES_API_PREFIX,
  type CreateQuoteInput,
  type GenerateQuoteInvoicesInput,
  type ListQuotesQueryInput,
  type QuoteDto,
  type QuoteListResponse,
  type RejectQuoteInput,
  type UpdateQuoteInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQueryString(query: ListQuotesQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.customerRequestId) params.set("customerRequestId", query.customerRequestId);
  if (query.projectId) params.set("projectId", query.projectId);
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const quotesService = {
  list(query: ListQuotesQueryInput) {
    return apiRequest<QuoteListResponse>(
      `${QUOTES_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}`, { auth: true });
  },

  create(input: CreateQuoteInput) {
    return apiRequest<QuoteDto>(QUOTES_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateQuoteInput) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  send(id: string) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}/send`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  approve(id: string) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}/approve`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  reject(id: string, input: RejectQuoteInput) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}/reject`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  cancel(id: string) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}/cancel`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  generateInvoices(id: string, input: GenerateQuoteInvoicesInput = {}) {
    return apiRequest<QuoteDto>(`${QUOTES_API_PREFIX}/${id}/invoices`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },
};
