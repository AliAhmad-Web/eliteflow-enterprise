import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { AiDocumentTypeValue } from "@enterprise/shared";

import { aiService } from "@/api/ai.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING_NOTES", label: "Meeting" },
  { value: "TECHNICAL_DOCS", label: "Technical" },
  { value: "PROJECT_SUMMARY", label: "Project" },
  { value: "GENERAL", label: "General" },
];

export const DOCUMENT_TEMPLATES: Array<{
  type: AiDocumentTypeValue;
  title: string;
  description: string;
  defaultPrompt: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    type: "PROPOSAL",
    title: "Proposal Generator",
    description: "Client-ready proposal outline",
    defaultPrompt:
      "Generate a concise project proposal with scope, timeline, and investment summary for:",
    icon: "document-text-outline",
  },
  {
    type: "MEETING_NOTES",
    title: "Meeting Notes",
    description: "Structured notes + action items",
    defaultPrompt:
      "Draft structured meeting notes with decisions and action items from:",
    icon: "people-outline",
  },
  {
    type: "TECHNICAL_DOCS",
    title: "Technical Documentation",
    description: "Architecture and implementation notes",
    defaultPrompt:
      "Write technical documentation covering architecture, APIs, and setup for:",
    icon: "code-slash-outline",
  },
  {
    type: "PROJECT_SUMMARY",
    title: "Project Summary",
    description: "Status, risks, and next steps",
    defaultPrompt:
      "Summarize project status, risks, blockers, and recommended next steps for:",
    icon: "briefcase-outline",
  },
  {
    type: "GENERAL",
    title: "Task Summary",
    description: "Priority and overdue task digest",
    defaultPrompt:
      "Summarize overdue and high-priority tasks with owners and suggested focus for today:",
    icon: "checkbox-outline",
  },
  {
    type: "EMAIL",
    title: "Email Generator",
    description: "Professional client email draft",
    defaultPrompt:
      "Draft a professional client email about project progress covering:",
    icon: "mail-outline",
  },
];

export default function AiDocumentStudioScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const [type, setType] = useState("all");

  const filters = useMemo(
    () => ({
      type: type === "all" ? undefined : type,
      page: 1,
      limit: 30,
    }),
    [type],
  );

  const documents = useQuery({
    queryKey: queryKeys.ai.documents(filters),
    queryFn: () =>
      aiService.listDocuments({
        type: filters.type as AiDocumentTypeValue | undefined,
        page: 1,
        limit: 30,
      }),
    enabled: perms.canUseAi,
  });

  if (!perms.canUseAi) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="AI Documents" />
        <EmptyState
          icon="lock-closed-outline"
          title="No access"
          message="ai:use permission required."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="AI Document Studio"
        subtitle="Generate & manage"
        right={
          <Pressable
            hitSlop={8}
            onPress={() => router.push("/(app)/ai-assistant")}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
          </Pressable>
        }
      />

      <FlatList
        data={documents.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[3],
          paddingBottom: spacing[8],
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing[4], marginBottom: spacing[2] }}>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Generators
            </Text>
            <View style={styles.templateGrid}>
              {DOCUMENT_TEMPLATES.map((tpl) => (
                <Pressable
                  key={tpl.title}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/ai-assistant/documents/new",
                      params: {
                        type: tpl.type,
                        title: tpl.title,
                        prompt: tpl.defaultPrompt,
                      },
                    })
                  }
                  style={[
                    styles.template,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: radius,
                      padding: spacing[3],
                    },
                  ]}
                >
                  <Ionicons name={tpl.icon} size={20} color={colors.primary} />
                  <Text
                    style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}
                    numberOfLines={2}
                  >
                    {tpl.title}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 11 }}
                    numberOfLines={2}
                  >
                    {tpl.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.section, { color: colors.foreground }]}>
              Your documents
            </Text>
            <FilterChips
              options={TYPE_FILTERS}
              value={type}
              onChange={(v) => v && setType(v)}
            />
            {documents.isLoading ? <ListSkeleton /> : null}
            {documents.isError ? (
              <ErrorState
                message="Could not load AI documents."
                onRetry={() => void documents.refetch()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !documents.isLoading ? (
            <EmptyState
              icon="document-outline"
              title="No documents yet"
              message="Pick a generator above to create your first draft."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(`/(app)/ai-assistant/documents/${item.id}`)
            }
            style={[
              styles.docRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
              },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {item.title || "Untitled"}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {item.type.replace(/_/g, " ")} · {formatDateTime(item.updatedAt)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: "700" },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  template: {
    width: "47%",
    borderWidth: 1,
    gap: 6,
    minHeight: 108,
  },
  docRow: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
