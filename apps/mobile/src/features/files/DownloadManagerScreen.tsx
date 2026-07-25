import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { StackHeader } from "@/components/navigation/StackHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  shareLocalFile,
  useDownloadStore,
} from "@/features/files/download-manager";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function DownloadManagerScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const items = useDownloadStore((s) => s.items);
  const clear = useDownloadStore((s) => s.clear);
  const remove = useDownloadStore((s) => s.remove);
  const download = useDownloadStore((s) => s.download);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Downloads"
        subtitle="Manager"
        right={
          items.length ? (
            <Pressable hitSlop={8} onPress={clear}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Clear
              </Text>
            </Pressable>
          ) : null
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[2],
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <EmptyState
            icon="download-outline"
            title="No downloads yet"
            message="Files you preview or download appear here."
          />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
              },
            ]}
          >
            <Ionicons
              name={
                item.status === "done"
                  ? "checkmark-circle"
                  : item.status === "error"
                    ? "alert-circle"
                    : "cloud-download-outline"
              }
              size={22}
              color={
                item.status === "error" ? colors.destructive : colors.primary
              }
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ color: colors.foreground, fontWeight: "700" }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {item.status}
                {item.status === "downloading"
                  ? ` · ${Math.round(item.progress * 100)}%`
                  : ""}
                {" · "}
                {formatDateTime(item.updatedAt)}
              </Text>
              {item.error ? (
                <Text style={{ color: colors.destructive, fontSize: 12 }}>
                  {item.error}
                </Text>
              ) : null}
              <View style={styles.actions}>
                {item.localUri && item.status === "done" ? (
                  <Button
                    title="Share"
                    variant="secondary"
                    onPress={() => void shareLocalFile(item.localUri!)}
                  />
                ) : null}
                {item.status === "error" ? (
                  <Button
                    title="Retry"
                    variant="secondary"
                    onPress={() => void download(item.fileId, item.name)}
                  />
                ) : null}
                <Pressable onPress={() => remove(item.id)} hitSlop={8}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap",
  },
});
