import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AiDocumentTypeValue } from "@enterprise/shared";

import { aiService } from "@/api/ai.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

const VALID_TYPES = new Set<AiDocumentTypeValue>([
  "PROPOSAL",
  "EMAIL",
  "MEETING_NOTES",
  "PROJECT_SUMMARY",
  "TECHNICAL_DOCS",
  "GENERAL",
]);

export default function AiDocumentCreateScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    title?: string;
    prompt?: string;
  }>();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const queryClient = useQueryClient();

  const initialType = (
    VALID_TYPES.has(params.type as AiDocumentTypeValue)
      ? params.type
      : "GENERAL"
  ) as AiDocumentTypeValue;

  const [title, setTitle] = useState(params.title ?? "");
  const [prompt, setPrompt] = useState(params.prompt ?? "");
  const [type] = useState<AiDocumentTypeValue>(initialType);

  const create = useMutation({
    mutationFn: () =>
      aiService.createDocument({
        title: title.trim() || "",
        type,
        prompt: prompt.trim(),
        generate: true,
      }),
    onSuccess: async (doc) => {
      await queryClient.invalidateQueries({ queryKey: ["ai", "documents"] });
      router.replace(`/(app)/ai-assistant/documents/${doc.id}`);
    },
    onError: (err) => {
      Alert.alert(
        "Generation failed",
        err instanceof Error ? err.message : "Try again.",
      );
    },
  });

  if (!perms.canUseAi) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="New document" />
        <Text style={{ color: colors.mutedForeground, padding: spacing[4] }}>
          ai:use permission required.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Generate document" subtitle={type.replace(/_/g, " ")} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: spacing[8] * 1.25,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Uses the existing `POST /ai/documents` API. Content is generated
          server-side when generate is enabled.
        </Text>
        <TextField
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          placeholder="Document title"
        />
        <TextField
          label="Prompt"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Describe what to generate…"
          multiline
          style={styles.prompt}
        />
        <Button
          title={create.isPending ? "Generating…" : "Generate"}
          loading={create.isPending}
          disabled={!prompt.trim()}
          onPress={() => create.mutate()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    minHeight: 160,
    textAlignVertical: "top",
  },
});
