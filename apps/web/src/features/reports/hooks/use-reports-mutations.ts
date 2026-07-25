"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSavedReportInput,
  ExportReportInput,
  UpdateSavedReportInput,
} from "@enterprise/shared";

import { reportsService } from "../services/reports.service";
import { REPORTS_QUERY_KEYS } from "../types/reports.types";

export function useCreateSavedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSavedReportInput) =>
      reportsService.createSaved(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: REPORTS_QUERY_KEYS.saved(),
      });
    },
  });
}

export function useUpdateSavedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavedReportInput }) =>
      reportsService.updateSaved(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: REPORTS_QUERY_KEYS.saved(),
      });
    },
  });
}

export function useDeleteSavedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reportsService.deleteSaved(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: REPORTS_QUERY_KEYS.saved(),
      });
    },
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (input: ExportReportInput) => reportsService.exportReport(input),
  });
}
