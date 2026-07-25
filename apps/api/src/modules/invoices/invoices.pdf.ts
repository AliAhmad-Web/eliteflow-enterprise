import type { InvoiceDto } from "@enterprise/shared";

/** Minimal single-page PDF generator (no external deps). */
export function buildInvoicePdf(invoice: InvoiceDto): Buffer {
  const lines: string[] = [];
  const push = (text: string) => lines.push(escapePdfText(text));

  push("EliteFlow ERP");
  push("INVOICE");
  push(`Invoice #: ${invoice.invoiceNumber}`);
  push(`Status: ${invoice.status}`);
  push(`Issue Date: ${invoice.issueDate}`);
  push(`Due Date: ${invoice.dueDate}`);
  push(`Client: ${invoice.clientName}`);
  if (invoice.projectName) {
    push(`Project: ${invoice.projectName}`);
  }
  push("");
  push("Items");
  push("------------------------------------------------");

  for (const item of invoice.items) {
    push(
      `${item.description}  Qty ${formatNum(item.quantity)}  @ ${formatMoney(item.unitPrice, invoice.currency)}  = ${formatMoney(item.lineTotal, invoice.currency)}`,
    );
  }

  push("------------------------------------------------");
  push(`Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`);
  push(`Discount: ${formatMoney(invoice.discountAmount, invoice.currency)}`);
  push(
    `Tax (${formatNum(invoice.taxRate)}%): ${formatMoney(invoice.taxAmount, invoice.currency)}`,
  );
  push(`Total: ${formatMoney(invoice.total, invoice.currency)}`);

  if (invoice.notes) {
    push("");
    push("Notes");
    push(invoice.notes);
  }

  push("");
  push("Thank you for your business.");

  return renderSimplePdf(lines);
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`;
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function renderSimplePdf(lines: string[]): Buffer {
  const contentLines = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    "14 TL",
    ...lines.flatMap((line, index) => {
      if (index === 0) {
        return [`(${line}) Tj`];
      }
      return ["T*", `(${line}) Tj`];
    }),
    "ET",
  ];

  const content = contentLines.join("\n");
  const contentLength = Buffer.byteLength(content, "utf8");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
