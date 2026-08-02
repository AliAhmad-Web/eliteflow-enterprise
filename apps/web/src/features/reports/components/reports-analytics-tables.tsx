"use client";

import type { AnalyticsDashboard } from "@enterprise/shared";

import { formatCurrency } from "../types/reports.types";
import { ReportsDataTable } from "./reports-data-table";

export function ReportsAnalyticsTables({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ReportsDataTable
        title="Top clients"
        headers={["Client", "Revenue", "Invoices"]}
        emptyMessage="No client revenue data for this period."
        rows={data.tables.topClients.map((client) => [
          client.name,
          formatCurrency(client.revenue),
          client.invoices.toLocaleString(),
        ])}
      />
      <ReportsDataTable
        title="At-risk projects"
        headers={["Project", "Status", "Progress", "Due"]}
        emptyMessage="No at-risk projects found."
        rows={data.tables.atRiskProjects.map((project) => [
          project.name,
          project.status,
          `${project.progress}%`,
          project.dueDate
            ? new Date(project.dueDate).toLocaleDateString()
            : "—",
        ])}
      />
      <ReportsDataTable
        title="Overdue invoices"
        headers={["Invoice", "Client", "Total", "Due"]}
        emptyMessage="No overdue invoices."
        rows={data.tables.overdueInvoices.map((invoice) => [
          invoice.number,
          invoice.clientName,
          formatCurrency(invoice.total),
          invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString()
            : "—",
        ])}
      />
    </div>
  );
}
