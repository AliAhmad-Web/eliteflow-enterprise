import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";
import type { Client } from "@enterprise/shared";

function toneForStatus(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "LEAD") return "info" as const;
  if (status === "INACTIVE") return "default" as const;
  return "default" as const;
}

interface ClientListItemProps {
  client: Client;
  onPress: () => void;
}

export const ClientListItem = memo(function ClientListItem({
  client,
  onPress,
}: ClientListItemProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius,
          padding: spacing[4],
          marginBottom: spacing[2],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        <Text
          numberOfLines={1}
          style={[styles.company, { color: colors.foreground }]}
        >
          {client.companyName}
        </Text>
        <StatusBadge label={client.status} tone={toneForStatus(client.status)} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
        {client.contactName} · {client.email}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>
        {[client.city, client.country].filter(Boolean).join(", ") || "—"} ·{" "}
        {formatDate(client.updatedAt)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  company: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
});
