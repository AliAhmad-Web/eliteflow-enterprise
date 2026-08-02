import type { AiDocument } from "@enterprise/shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Stable, descriptive markdown download filename. */
export function buildAiDocumentExportFilename(document: AiDocument): string {
  const typeSlug = document.type.toLowerCase().replace(/_/g, "-");
  const titleSlug =
    document.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  const date = new Date().toISOString().slice(0, 10);
  return `${typeSlug}-${titleSlug}-${date}.md`;
}

/** Legacy filename used when AI_DOCS_EXPORT_ENHANCED is OFF. */
export function buildAiDocumentLegacyExportFilename(
  document: AiDocument,
): string {
  return `${document.title.replace(/\s+/g, "-").toLowerCase()}.md`;
}

export function downloadAiDocumentMarkdown(
  document: AiDocument,
  filename: string,
): void {
  const blob = new Blob([document.content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Browser print of a print-friendly document view (client-only). */
export function printAiDocument(document: AiDocument): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;

  const title = escapeHtml(document.title);
  const type = escapeHtml(document.type.replace(/_/g, " "));
  const body = escapeHtml(document.content);

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem; color: #111; line-height: 1.55; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .meta { color: #555; font-size: 0.85rem; margin-bottom: 1.5rem; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9rem; }
    @media print { body { margin: 1.25cm; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">${type}</p>
  <pre>${body}</pre>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
