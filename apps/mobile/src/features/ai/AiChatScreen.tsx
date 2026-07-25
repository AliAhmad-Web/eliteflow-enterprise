import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { AiChatRequestInput } from "@enterprise/shared";

import { AI_SUGGESTED_PROMPTS, aiService } from "@/api/ai.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

type Bubble = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  streaming?: boolean;
};

export default function AiChatScreen() {
  const { conversationId: paramId } = useLocalSearchParams<{
    conversationId?: string;
  }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Bubble>>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(
    paramId,
  );
  const [mode, setMode] = useState<AiChatRequestInput["mode"]>("ASK");
  const [input, setInput] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [streamText, setStreamText] = useState("");

  const history = useQuery({
    queryKey: queryKeys.ai.conversation(conversationId ?? "new"),
    queryFn: () => aiService.getConversation(conversationId!),
    enabled: Boolean(conversationId) && perms.canUseAi,
  });

  useEffect(() => {
    if (!history.data?.messages) return;
    setBubbles(
      history.data.messages.map((m) => ({
        id: m.id,
        role: m.role as Bubble["role"],
        content: m.content,
      })),
    );
  }, [history.data]);

  const send = useMutation({
    mutationFn: async () => {
      const message = input.trim();
      if (!message) return;

      const userBubble: Bubble = {
        id: `local-user-${Date.now()}`,
        role: "USER",
        content: message,
      };
      setBubbles((prev) => [...prev, userBubble]);
      setInput("");
      setStreamText("");

      const assistantId = `local-ai-${Date.now()}`;
      setBubbles((prev) => [
        ...prev,
        { id: assistantId, role: "ASSISTANT", content: "", streaming: true },
      ]);

      const result = await aiService.chatStream(
        {
          message,
          conversationId,
          mode,
        },
        {
          onMeta: (meta) => setConversationId(meta.conversationId),
          onDelta: (chunk) => {
            setStreamText((prev) => prev + chunk);
            setBubbles((prev) =>
              prev.map((b) =>
                b.id === assistantId
                  ? { ...b, content: (b.content || "") + chunk }
                  : b,
              ),
            );
          },
        },
      );

      setConversationId(result.conversation.id);
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === assistantId
            ? {
                id: result.assistantMessage.id,
                role: "ASSISTANT",
                content: result.assistantMessage.content,
                streaming: false,
              }
            : b,
        ),
      );

      await queryClient.invalidateQueries({ queryKey: queryKeys.ai.all });
      return result;
    },
  });

  const displayBubbles = useMemo(() => bubbles, [bubbles]);

  if (!perms.canUseAi) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="AI Assistant" />
        <EmptyState
          icon="lock-closed-outline"
          title="No AI access"
          message="Your role does not include ai:use."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="AI Assistant"
        subtitle={mode?.replace(/_/g, " ") ?? "ASK"}
        right={
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(app)/ai-assistant/documents")}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color={colors.primary}
              />
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(app)/ai-assistant/history")}
            >
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        {history.isLoading && conversationId ? <LoadingState /> : null}
        {history.isError ? (
          <View style={{ padding: spacing[4] }}>
            <ErrorState
              message="Could not load conversation."
              onRetry={() => void history.refetch()}
            />
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={displayBubbles}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          initialNumToRender={16}
          windowSize={8}
          maxToRenderPerBatch={10}
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[3],
            paddingBottom: spacing[4],
          }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListHeaderComponent={
            displayBubbles.length === 0 ? (
              <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  Suggested prompts
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {AI_SUGGESTED_PROMPTS.map((p) => (
                    <Pressable
                      key={p.label}
                      onPress={() => {
                        setMode(p.mode);
                        setInput(p.prompt);
                      }}
                      style={{
                        backgroundColor: colors.muted,
                        borderRadius: radius,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.role === "USER";
            return (
              <View
                style={[
                  styles.bubble,
                  {
                    alignSelf: mine ? "flex-end" : "flex-start",
                    backgroundColor: mine ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: radius,
                    maxWidth: "88%",
                  },
                ]}
              >
                <Text
                  style={{
                    color: mine ? colors.primaryForeground : colors.foreground,
                    lineHeight: 21,
                  }}
                >
                  {item.content || (item.streaming ? "…" : "")}
                </Text>
              </View>
            );
          }}
        />

        <View
          style={{
            padding: spacing[4],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            gap: spacing[3],
            backgroundColor: colors.background,
          }}
        >
          <TextField
            label="Message"
            value={input}
            onChangeText={setInput}
            multiline
            style={{ minHeight: 72, textAlignVertical: "top" }}
            placeholder="Ask about projects, draft email, summarize…"
          />
          <Button
            title={send.isPending ? "Thinking…" : "Send"}
            loading={send.isPending}
            disabled={!input.trim() || send.isPending}
            onPress={() => send.mutate()}
          />
          {streamText && send.isPending ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Streaming…
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
