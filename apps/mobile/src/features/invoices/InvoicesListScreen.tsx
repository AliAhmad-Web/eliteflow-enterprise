import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Invoice, InvoiceStatusValue } from "@enterprise/shared";

import { invoicesService } from "@/api/invoices.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { TextField } from "@/components/ui/TextField";
import { useInfiniteResource } from "@/hooks/useInfiniteResource";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "" as const, label: "All" },
  { value: "DRAFT" as const, label: "Draft" },
  { value: "SENT" as const, label: "Sent" },
  { value: "PENDING" as const, label: "Pending" },
  { value: "PAID" as const, label: "Paid" },
  { value: "OVERDUE" as const, label: "Overdue" },
  { value: "CANCELLED" as const, label: "Cancelled" },
];

export default function InvoicesListScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const search = useSearchQuery();
  const [status, setStatus] = useState<InvoiceStatusValue | "">("");

  const filters = {
    search: search.query,
    status: status || undefined,
  };

  const list = useInfiniteResource<Invoice, typeof filters>({
    queryKey: queryKeys.invoices.list(filters),
    filters,
    enabled: perms.canReadInvoices,
    fetchPage: (page, f, limit) =>
      invoicesService.list({
        search: f.search ?? "",
        status: f.status as InvoiceStatusValue | undefined,
        sortBy: "updatedAt",
        sortOrder: "desc",
        page,
        limit,
      }),
  });

  if (!perms.canReadInvoices) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Invoices" />
        <Text style={{ padding: spacing[4], color: colors.mutedForeground }}>
          You do not have permission to view invoices.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Invoices" subtitle="Billing" />
      <View style={{ paddingHorizontal: spacing[4], gap: spacing[3] }}>
        <TextField
          label="Search"
          value={search.value}
          onChangeText={search.setValue}
          placeholder="Invoice number or client"
        />
        <FilterChips
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setStatus(v as InvoiceStatusValue | "")}
        />
      </View>
      <InfiniteList
        data={list.items}
        isLoading={list.isLoading}
        isFetchingNextPage={list.isFetchingNextPage}
        hasNextPage={list.hasNextPage}
        onEndReached={list.fetchNextPage}
        onRefresh={list.refetch}
        isRefreshing={list.isRefetching}
        keyExtractor={(item) => item.id}
        emptyTitle="No invoices"
        emptyMessage="Invoices for your company will appear here."
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/invoices/${item.id}`)}
            style={{
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {item.invoiceNumber}
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>
              {item.clientName} · {item.status} · {item.currency}{" "}
              {Number(item.total).toFixed(2)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
