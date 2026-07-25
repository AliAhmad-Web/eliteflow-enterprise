import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { clientsService } from "@/api/clients.service";
import { queryKeys } from "@/api/query-keys";
import { ClientFormScreen } from "@/features/clients/ClientFormScreen";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTheme } from "@/theme/theme.store";
import { View } from "react-native";

export default function EditClientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const detail = useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => clientsService.getById(id!),
    enabled: Boolean(id),
  });

  if (detail.isLoading || !detail.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <LoadingState />
      </View>
    );
  }

  const c = detail.data;
  return (
    <ClientFormScreen
      mode="edit"
      clientId={c.id}
      initial={{
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone ?? "",
        website: c.website ?? "",
        addressLine1: c.addressLine1 ?? "",
        city: c.city ?? "",
        country: c.country ?? "",
        status: c.status,
        notes: c.notes ?? "",
      }}
    />
  );
}
