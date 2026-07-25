import { InvoiceStatus } from "../../../src/generated/client";

export interface InvoiceSeedRecord {
  invoiceNumber?: string;
  clientEmail: string;
  projectName?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency?: string;
  taxRate: number;
  discountAmount: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export const INVOICE_SEED_DATA: readonly InvoiceSeedRecord[] = [
  {
    clientEmail: "jane.cooper@acmecorp.com",
    projectName: "Acme Portal Redesign",
    status: InvoiceStatus.PAID,
    issueDate: "2026-06-15",
    dueDate: "2026-07-15",
    taxRate: 8.5,
    discountAmount: "500",
    notes: "Phase 1 discovery and design deposit.",
    items: [
      {
        description: "Discovery & wireframes",
        quantity: 1,
        unitPrice: 12000,
      },
      {
        description: "UI system setup",
        quantity: 40,
        unitPrice: 150,
      },
    ],
  },
  {
    clientEmail: "jane.cooper@acmecorp.com",
    projectName: "Acme Portal Redesign",
    status: InvoiceStatus.SENT,
    issueDate: "2026-07-10",
    dueDate: "2026-08-10",
    taxRate: 8.5,
    discountAmount: "0",
    notes: "Development milestone billing.",
    items: [
      {
        description: "Frontend implementation sprint",
        quantity: 80,
        unitPrice: 160,
      },
      {
        description: "API integration",
        quantity: 40,
        unitPrice: 175,
      },
    ],
  },
  {
    clientEmail: "omar@novalabs.io",
    projectName: "Nova Labs Data Pipeline",
    status: InvoiceStatus.PENDING,
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    taxRate: 7,
    discountAmount: "250",
    items: [
      {
        description: "Architecture workshop",
        quantity: 2,
        unitPrice: 2500,
      },
      {
        description: "Pipeline scaffolding",
        quantity: 1,
        unitPrice: 8000,
      },
    ],
  },
  {
    clientEmail: "emily@brightsidemedia.com",
    projectName: "Brightside Brand Site",
    status: InvoiceStatus.OVERDUE,
    issueDate: "2026-05-20",
    dueDate: "2026-06-20",
    taxRate: 6,
    discountAmount: "0",
    notes: "Content inventory and initial design.",
    items: [
      {
        description: "Content inventory",
        quantity: 1,
        unitPrice: 1800,
      },
      {
        description: "Brand site design concepts",
        quantity: 3,
        unitPrice: 2200,
      },
    ],
  },
  {
    clientEmail: "jane.cooper@acmecorp.com",
    projectName: "Acme Security Review",
    status: InvoiceStatus.DRAFT,
    issueDate: "2026-07-18",
    dueDate: "2026-08-18",
    taxRate: 8.5,
    discountAmount: "100",
    items: [
      {
        description: "Security review remediations",
        quantity: 16,
        unitPrice: 185,
      },
    ],
  },
  {
    clientEmail: "carlos@orbitlogistics.com",
    status: InvoiceStatus.CANCELLED,
    issueDate: "2026-04-01",
    dueDate: "2026-04-30",
    taxRate: 5,
    discountAmount: "0",
    notes: "Cancelled after scope change.",
    items: [
      {
        description: "Logistics portal kickoff",
        quantity: 1,
        unitPrice: 3500,
      },
    ],
  },
];
