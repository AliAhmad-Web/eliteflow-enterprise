import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invoicesService } from "@/api/invoices.service";
import { queryKeys } from "@/api/query-keys";
import { ApiClientError } from "@/api/api-error";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.invoices.detail(id!),
    queryFn: () => invoicesService.getById(id!),
    enabled: Boolean(id) && perms.canReadInvoices,
  });

  const notice = useMutation({
    mutationFn: () =>
      invoicesService.reportPaymentNotice(id!, {
        note: "Payment notice submitted from mobile",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(id!) });
      Alert.alert("Submitted", "Payment notice recorded.");
    },
    onError: (err) => {
      Alert.alert(
        "Unable to submit",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  if (!perms.canReadInvoices) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Invoice" onBack={() => router.back()} />
        <Text style={{ padding: spacing[4], color: colors.mutedForeground }}>
          Permission denied.
        </Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Invoice" onBack={() => router.back()} />
        <LoadingState message="Loading invoice…" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Invoice" onBack={() => router.back()} />
        <ErrorState
          title="Invoice not found"
          message="You may not have access to this invoice."
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const invoice = query.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={invoice.invoiceNumber}
        subtitle={invoice.status}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        <Text
          style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}
        >
          {invoice.currency} {Number(invoice.total).toFixed(2)}
        </Text>
        <Text style={{ color: colors.mutedForeground }}>
          Client: {invoice.clientName}
        </Text>
        <Text style={{ color: colors.mutedForeground }}>
          Issued: {invoice.issueDate ?? "—"}
        </Text>
        <Text style={{ color: colors.mutedForeground }}>
          Due: {invoice.dueDate ?? "—"}
        </Text>
        {invoice.notes ? (
          <Text style={{ color: colors.foreground }}>{invoice.notes}</Text>
        ) : null}

        <Button
          title={notice.isPending ? "Submitting…" : "Report payment notice"}
          onPress={() => notice.mutate()}
          disabled={notice.isPending || invoice.status === "PAID"}
          loading={notice.isPending}
        />
      </ScrollView>
    </View>
  );
}
