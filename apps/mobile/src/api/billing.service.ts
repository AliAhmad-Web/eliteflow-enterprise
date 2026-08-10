import {
  BILLING_API_PREFIX,
  type CancelSubscriptionInput,
  type OrganizationSubscriptionDto,
  type SubscriptionPlanDto,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";

export const billingService = {
  listPlans() {
    return apiRequest<{ plans: SubscriptionPlanDto[] }>(
      `${BILLING_API_PREFIX}/plans`,
      { auth: true },
    );
  },

  getSubscription() {
    return apiRequest<{ subscription: OrganizationSubscriptionDto }>(
      `${BILLING_API_PREFIX}/subscription`,
      { auth: true },
    );
  },

  cancelSubscription(input: CancelSubscriptionInput = { atPeriodEnd: true }) {
    return apiRequest<{ subscription: OrganizationSubscriptionDto }>(
      `${BILLING_API_PREFIX}/cancel`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  reactivateSubscription() {
    return apiRequest<{ subscription: OrganizationSubscriptionDto }>(
      `${BILLING_API_PREFIX}/reactivate`,
      {
        method: "POST",
        body: {},
        auth: true,
      },
    );
  },
};
