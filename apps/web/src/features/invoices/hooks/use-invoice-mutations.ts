"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from "@enterprise/shared";

import { invoicesService } from "../services/invoices.service";
import { INVOICES_QUERY_KEYS } from "../types/invoices.types";

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => invoicesService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.all,
      });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInvoiceInput }) =>
      invoicesService.update(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.detail(variables.id),
      });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.all,
      });
    },
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await invoicesService.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useReportInvoicePaymentNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      note,
    }: {
      id: string;
      note?: string;
    }) => invoicesService.reportPaymentNotice(id, note ? { note } : {}),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.detail(variables.id),
      });
      await queryClient.invalidateQueries({
        queryKey: INVOICES_QUERY_KEYS.all,
      });
    },
  });
}
