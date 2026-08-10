import type {
  CheckoutSessionResponse,
  OrganizationSubscriptionDto,
  SubscriptionEventDto,
  SubscriptionPlanDto,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

export const billingService = {
  async listPlans(): Promise<SubscriptionPlanDto[]> {
    const res = await apiRequest<ApiSuccess<{ plans: SubscriptionPlanDto[] }>>(
      "/billing/plans",
    );
    return res.data.plans;
  },

  async getSubscription(): Promise<OrganizationSubscriptionDto> {
    const res = await apiRequest<
      ApiSuccess<{ subscription: OrganizationSubscriptionDto }>
    >("/billing/subscription");
    return res.data.subscription;
  },

  async listEvents(): Promise<SubscriptionEventDto[]> {
    const res = await apiRequest<
      ApiSuccess<{ events: SubscriptionEventDto[] }>
    >("/billing/events");
    return res.data.events;
  },

  async getRuntime(): Promise<{
    paymentsEnabled: boolean;
    mode: "disabled" | "test" | "live";
    webhookConfigured: boolean;
  }> {
    const res = await apiRequest<
      ApiSuccess<{
        runtime: {
          paymentsEnabled: boolean;
          mode: "disabled" | "test" | "live";
          webhookConfigured: boolean;
        };
      }>
    >("/billing/runtime");
    return res.data.runtime;
  },

  async createCheckout(planCode: string): Promise<CheckoutSessionResponse> {
    const res = await apiRequest<ApiSuccess<CheckoutSessionResponse>>(
      "/billing/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planCode }),
      },
    );
    return res.data;
  },

  async cancel(atPeriodEnd = true): Promise<OrganizationSubscriptionDto> {
    const res = await apiRequest<
      ApiSuccess<{ subscription: OrganizationSubscriptionDto }>
    >("/billing/cancel", {
      method: "POST",
      body: JSON.stringify({ atPeriodEnd }),
    });
    return res.data.subscription;
  },

  async reactivate(): Promise<OrganizationSubscriptionDto> {
    const res = await apiRequest<
      ApiSuccess<{ subscription: OrganizationSubscriptionDto }>
    >("/billing/reactivate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return res.data.subscription;
  },

  async createPortalSession(): Promise<{ url: string }> {
    const res = await apiRequest<ApiSuccess<{ url: string }>>(
      "/billing/portal-session",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    return res.data;
  },
};
