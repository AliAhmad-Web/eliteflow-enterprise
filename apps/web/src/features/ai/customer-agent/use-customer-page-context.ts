"use client";

import type { AiPageContextInput } from "@enterprise/shared";
import { useParams, usePathname } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PREFIXES: readonly {
  prefix: string;
  entityType: NonNullable<AiPageContextInput["entityType"]>;
}[] = [
  { prefix: "/requests/", entityType: "request" },
  { prefix: "/quotes/", entityType: "quote" },
  { prefix: "/payments/", entityType: "payment" },
  { prefix: "/invoices/", entityType: "invoice" },
  { prefix: "/projects/", entityType: "project" },
  { prefix: "/tasks/", entityType: "task" },
];

export function useCustomerPageContext(): AiPageContextInput {
  const pathname = usePathname() ?? "/";
  const params = useParams();
  const idParam = params?.id;
  const routeId = typeof idParam === "string" ? idParam : null;

  for (const item of PREFIXES) {
    if (!pathname.startsWith(item.prefix)) continue;
    const fromPath = pathname.slice(item.prefix.length).split(/[/?#]/)[0];
    const entityId =
      routeId && UUID_RE.test(routeId)
        ? routeId
        : fromPath && UUID_RE.test(fromPath)
          ? fromPath
          : undefined;
    return {
      path: pathname,
      entityType: item.entityType,
      entityId,
    };
  }

  return { path: pathname };
}

export function customerSuggestedPrompts(path: string): string[] {
  if (path.startsWith("/requests")) {
    return [
      "What is the status of this request?",
      "What should I do next?",
      "How do I submit a new request?",
    ];
  }
  if (path.startsWith("/quotes")) {
    return [
      "Explain this quote and the agreed deal.",
      "How much is the advance and remaining balance?",
      "What happens after I accept the quote?",
    ];
  }
  if (path.startsWith("/payments") || path.startsWith("/invoices")) {
    return [
      "What is my payment status?",
      "Which payment methods can I use?",
      "Why is my project still locked?",
    ];
  }
  if (path.startsWith("/projects") || path.startsWith("/tasks") || path === "/portal") {
    return [
      "What is the status of my project?",
      "What is the next step for me?",
      "How do I open my workspace?",
    ];
  }
  return [
    "Summarize my current work with EliteFlow.",
    "What should I do next?",
    "How do I make a payment?",
  ];
}
