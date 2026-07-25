import {
  MilestoneStatus,
  ProjectPriority,
  ProjectStatus,
  type PrismaClient,
} from "../../../src/generated/client";

export interface ProjectSeedRecord {
  name: string;
  description?: string;
  clientEmail: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  dueDate?: string;
  progress: number;
  budget?: string;
  memberEmails: string[];
  milestones: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    status: MilestoneStatus;
    sortOrder: number;
  }>;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  }>;
}

export const PROJECT_SEED_DATA: readonly ProjectSeedRecord[] = [
  {
    name: "Acme Portal Redesign",
    description:
      "Refresh the customer portal UX, navigation, and billing self-serve flows.",
    clientEmail: "jane.cooper@acmecorp.com",
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    startDate: "2026-06-01",
    dueDate: "2026-09-30",
    progress: 45,
    budget: "85000",
    memberEmails: ["employee@eliteflow.dev", "admin@eliteflow.dev"],
    milestones: [
      {
        title: "Discovery & wireframes",
        description: "Stakeholder interviews and IA proposal.",
        dueDate: "2026-06-30",
        status: MilestoneStatus.COMPLETED,
        sortOrder: 0,
      },
      {
        title: "UI system & prototypes",
        dueDate: "2026-07-31",
        status: MilestoneStatus.IN_PROGRESS,
        sortOrder: 1,
      },
      {
        title: "Production launch",
        dueDate: "2026-09-30",
        status: MilestoneStatus.PENDING,
        sortOrder: 2,
      },
    ],
    attachments: [
      {
        fileName: "acme-portal-brief.pdf",
        fileUrl: "https://files.example.com/projects/acme-portal-brief.pdf",
        mimeType: "application/pdf",
      },
    ],
  },
  {
    name: "Nova Labs Data Pipeline",
    description: "ETL pipeline for product analytics and warehouse sync.",
    clientEmail: "omar@novalabs.io",
    status: ProjectStatus.NOT_STARTED,
    priority: ProjectPriority.MEDIUM,
    startDate: "2026-08-01",
    dueDate: "2026-11-15",
    progress: 0,
    budget: "42000",
    memberEmails: ["employee@eliteflow.dev"],
    milestones: [
      {
        title: "Architecture review",
        dueDate: "2026-08-20",
        status: MilestoneStatus.PENDING,
        sortOrder: 0,
      },
      {
        title: "Ingestion MVP",
        dueDate: "2026-10-01",
        status: MilestoneStatus.PENDING,
        sortOrder: 1,
      },
    ],
  },
  {
    name: "Brightside Brand Site",
    description: "Marketing site rebuild with CMS and analytics.",
    clientEmail: "emily@brightsidemedia.com",
    status: ProjectStatus.ON_HOLD,
    priority: ProjectPriority.LOW,
    startDate: "2026-05-01",
    dueDate: "2026-07-15",
    progress: 20,
    budget: "18000",
    memberEmails: ["admin@eliteflow.dev"],
    milestones: [
      {
        title: "Content inventory",
        dueDate: "2026-05-20",
        status: MilestoneStatus.COMPLETED,
        sortOrder: 0,
      },
      {
        title: "Design freeze",
        dueDate: "2026-06-15",
        status: MilestoneStatus.CANCELLED,
        sortOrder: 1,
      },
    ],
  },
  {
    name: "Acme Security Review",
    description: "Quarterly access review and hardening checklist.",
    clientEmail: "jane.cooper@acmecorp.com",
    status: ProjectStatus.COMPLETED,
    priority: ProjectPriority.URGENT,
    startDate: "2026-04-01",
    dueDate: "2026-05-15",
    progress: 100,
    budget: "12000",
    memberEmails: ["employee@eliteflow.dev"],
    milestones: [
      {
        title: "Audit complete",
        dueDate: "2026-05-10",
        status: MilestoneStatus.COMPLETED,
        sortOrder: 0,
      },
    ],
    attachments: [
      {
        fileName: "security-findings.md",
        fileUrl: "https://files.example.com/projects/acme-security-findings.md",
        mimeType: "text/markdown",
      },
    ],
  },
];

/** Portal user email → client company email used for companyId linking */
export const CLIENT_PORTAL_LINKS: ReadonlyArray<{
  userEmail: string;
  clientEmail: string;
}> = [
  {
    userEmail: "client@eliteflow.dev",
    clientEmail: "jane.cooper@acmecorp.com",
  },
];
