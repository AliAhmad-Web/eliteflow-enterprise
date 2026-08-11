import {
  CUSTOMER_REQUESTS_API_PREFIX,
  type AddCustomerRequestAttachmentInput,
  type ApproveCustomerRequestInput,
  type ClarifyCustomerRequestInput,
  type ConvertCustomerRequestInput,
  type CreateCustomerRequestInput,
  type CustomerRequestDto,
  type ListCustomerRequestsQueryInput,
  type RejectCustomerRequestInput,
  type StartCustomerRequestReviewInput,
  type UpdateCustomerRequestInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

import type { CustomerRequestListResponse } from "../types/query-keys";

function toQueryString(query: ListCustomerRequestsQueryInput): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.type) {
    params.set("type", query.type);
  }
  if (query.priority) {
    params.set("priority", query.priority);
  }
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const customerRequestsService = {
  list(query: ListCustomerRequestsQueryInput) {
    return apiRequest<CustomerRequestListResponse>(
      `${CUSTOMER_REQUESTS_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}`,
      { auth: true },
    );
  },

  create(input: CreateCustomerRequestInput) {
    return apiRequest<CustomerRequestDto>(CUSTOMER_REQUESTS_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateCustomerRequestInput) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}`,
      {
        method: "PATCH",
        body: input,
        auth: true,
      },
    );
  },

  submit(id: string) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/submit`,
      { method: "POST", auth: true },
    );
  },

  withdraw(id: string) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/withdraw`,
      { method: "POST", auth: true },
    );
  },

  addAttachment(id: string, input: AddCustomerRequestAttachmentInput) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/attachments`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  startReview(id: string, input: StartCustomerRequestReviewInput = {}) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/review`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  requestClarification(id: string, input: ClarifyCustomerRequestInput) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/clarification`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  approve(id: string, input: ApproveCustomerRequestInput = {}) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/approve`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  reject(id: string, input: RejectCustomerRequestInput) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/reject`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  convert(id: string, input: ConvertCustomerRequestInput) {
    return apiRequest<CustomerRequestDto>(
      `${CUSTOMER_REQUESTS_API_PREFIX}/${id}/convert`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },
};
