import { prisma, type BillingPlanStatus, type Prisma } from "@enterprise/database";

const ORG_BILLING_KEY = "default";

export class BillingRepository {
  async listActivePlans() {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async findPlanByCode(code: string) {
    return prisma.subscriptionPlan.findFirst({
      where: { code, isActive: true },
    });
  }

  async getOrCreateOrganizationBilling() {
    const existing = await prisma.organizationBilling.findUnique({
      where: { key: ORG_BILLING_KEY },
      include: { plan: true },
    });
    if (existing) return existing;

    return prisma.organizationBilling.create({
      data: { key: ORG_BILLING_KEY },
      include: { plan: true },
    });
  }

  async updateOrganizationBilling(
    id: string,
    data: Prisma.OrganizationBillingUpdateInput,
  ) {
    return prisma.organizationBilling.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  async listSubscriptionEvents(organizationBillingId: string, take = 20) {
    return prisma.subscriptionEvent.findMany({
      where: { organizationBillingId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async createSubscriptionEvent(input: {
    organizationBillingId: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    stripeEventId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.subscriptionEvent.create({
      data: {
        organizationBillingId: input.organizationBillingId,
        eventType: input.eventType,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        stripeEventId: input.stripeEventId ?? null,
        metadata: input.metadata,
      },
    });
  }

  async findWebhookEvent(id: string) {
    return prisma.stripeWebhookEvent.findUnique({ where: { id } });
  }

  async recordWebhookEvent(id: string, type: string, payloadHash?: string) {
    return prisma.stripeWebhookEvent.create({
      data: { id, type, payloadHash: payloadHash ?? null },
    });
  }

  async countActiveUsers(): Promise<number> {
    return prisma.user.count({ where: { deletedAt: null } });
  }

  async findInvoiceByStripeId(stripeInvoiceId: string) {
    return prisma.invoice.findFirst({
      where: { stripeInvoiceId, deletedAt: null },
    });
  }

  async markInvoicePaidByStripeId(
    stripeInvoiceId: string,
    amount: number | null,
  ) {
    const invoice = await this.findInvoiceByStripeId(stripeInvoiceId);
    if (!invoice) return null;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paymentStatus: "PAID" },
      });
      await tx.invoicePaymentHistory.create({
        data: {
          invoiceId: invoice.id,
          status: "PAID",
          amount: amount != null ? amount : invoice.total,
          note: "Synced from Stripe invoice.paid",
        },
      });
      return updated;
    });
  }
}

export const billingRepository = new BillingRepository();

export function mapStripeStatusToBilling(
  status: string | null | undefined,
): BillingPlanStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}
