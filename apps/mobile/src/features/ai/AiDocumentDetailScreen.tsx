import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { aiService } from "@/api/ai.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function AiDocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  const doc = useQuery({
    queryKey: queryKeys.ai.document(id!),
    queryFn: () => aiService.getDocument(id!),
    enabled: Boolean(id),
  });

  async function share() {
    if (!doc.data) return;
    const path = `${FileSystem.cacheDirectory}ai-doc-${doc.data.id}.txt`;
    await FileSystem.writeAsStringAsync(
      path,
      `${doc.data.title}\n\n${doc.data.content}`,
    );
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={doc.data?.title || "Document"}
        subtitle={doc.data?.type?.replace(/_/g, " ")}
      />

      {doc.isLoading ? <LoadingState /> : null}
      {doc.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load document."
            onRetry={() => void doc.refetch()}
          />
        </View>
      ) : null}
      {!doc.isLoading && !doc.data ? (
        <EmptyState title="Not found" message="Document may have been removed." />
      ) : null}

      {doc.data ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[4],
            paddingBottom: spacing[8] * 1.25,
          }}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            Updated {formatDateTime(doc.data.updatedAt)}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Prompt
            </Text>
            <Text style={{ color: colors.foreground, lineHeight: 20 }}>
              {doc.data.prompt}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Content
            </Text>
            <Text
              style={{
                color: colors.foreground,
                lineHeight: 22,
                fontSize: 15,
              }}
              selectable
            >
              {doc.data.content || "No content generated."}
            </Text>
          </View>
          <Button title="Share" variant="secondary" onPress={() => void share()} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, gap: 8 },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
});
