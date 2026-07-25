import {
  TaskPriority,
  TaskStatus,
} from "../../../src/generated/client";

export interface TaskSeedRecord {
  title: string;
  description?: string;
  projectName: string;
  assigneeEmail?: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  startDate?: string;
  dueDate?: string;
  progress: number;
  estimatedHours?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  }>;
  comments?: Array<{
    authorEmail: string;
    body: string;
  }>;
}

export const TASK_SEED_DATA: readonly TaskSeedRecord[] = [
  {
    title: "Finalize portal wireframes",
    description: "Complete IA and low-fidelity wireframes for the Acme portal.",
    projectName: "Acme Portal Redesign",
    assigneeEmail: "employee@eliteflow.dev",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    labels: ["design", "ux"],
    startDate: "2026-06-10",
    dueDate: "2026-07-25",
    progress: 60,
    estimatedHours: "24",
    attachments: [
      {
        fileName: "wireframe-v2.fig",
        fileUrl: "https://files.example.com/tasks/wireframe-v2.fig",
        mimeType: "application/octet-stream",
      },
    ],
    comments: [
      {
        authorEmail: "admin@eliteflow.dev",
        body: "Please align navigation with the billing self-serve flow.",
      },
      {
        authorEmail: "employee@eliteflow.dev",
        body: "Updated sidebar draft — ready for review tomorrow.",
      },
    ],
  },
  {
    title: "Implement billing self-serve API",
    description: "Expose invoice history endpoints for the customer portal.",
    projectName: "Acme Portal Redesign",
    assigneeEmail: "employee@eliteflow.dev",
    status: TaskStatus.TODO,
    priority: TaskPriority.CRITICAL,
    labels: ["backend", "api"],
    startDate: "2026-07-20",
    dueDate: "2026-08-15",
    progress: 0,
    estimatedHours: "40",
  },
  {
    title: "Stakeholder design review",
    description: "Present prototypes to Acme stakeholders.",
    projectName: "Acme Portal Redesign",
    assigneeEmail: "admin@eliteflow.dev",
    status: TaskStatus.REVIEW,
    priority: TaskPriority.MEDIUM,
    labels: ["meeting"],
    startDate: "2026-07-15",
    dueDate: "2026-07-22",
    progress: 90,
    estimatedHours: "4",
  },
  {
    title: "Warehouse schema draft",
    description: "Define staging tables for Nova Labs analytics pipeline.",
    projectName: "Nova Labs Data Pipeline",
    assigneeEmail: "employee@eliteflow.dev",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    labels: ["data", "etl"],
    startDate: "2026-08-01",
    dueDate: "2026-08-20",
    progress: 0,
    estimatedHours: "16",
  },
  {
    title: "Content migration checklist",
    description: "Inventory existing Brightside pages before CMS cutover.",
    projectName: "Brightside Brand Site",
    assigneeEmail: "admin@eliteflow.dev",
    status: TaskStatus.BLOCKED,
    priority: TaskPriority.LOW,
    labels: ["content"],
    startDate: "2026-05-05",
    dueDate: "2026-05-25",
    progress: 35,
    estimatedHours: "12",
    comments: [
      {
        authorEmail: "admin@eliteflow.dev",
        body: "Blocked on client providing legacy CMS export.",
      },
    ],
  },
  {
    title: "Close security findings",
    description: "Remediate remaining medium findings from the audit.",
    projectName: "Acme Security Review",
    assigneeEmail: "employee@eliteflow.dev",
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    labels: ["security"],
    startDate: "2026-04-20",
    dueDate: "2026-05-12",
    progress: 100,
    estimatedHours: "20",
  },
];
