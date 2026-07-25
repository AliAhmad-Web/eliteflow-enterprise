import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COMMUNICATION_API_PREFIX } from "@enterprise/shared";

import { communicationService } from "@/api/communication.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TextField } from "@/components/ui/TextField";
import {
  VoicePlayer,
  VoiceRecorder,
  type VoiceAttachmentPayload,
} from "@/features/communication/VoiceNote";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";
import { mutateOrEnqueue } from "@/offline/mutation-queue";
import { useTheme } from "@/theme/theme.store";

const QUICK_REACTIONS = ["👍", "❤️", "🎉", "✅"];

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [queuedNote, setQueuedNote] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useQuery({
    queryKey: ["communication", "conversation", id],
    queryFn: () => communicationService.getConversation(id!),
    enabled: Boolean(id),
  });

  const messages = useQuery({
    queryKey: queryKeys.communication.messages(id!, 1),
    queryFn: () =>
      communicationService.listMessages(id!, { page: 1, pageSize: 50 }),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const items = messages.data?.items;
    if (!items?.length) return;
    const last = items[items.length - 1];
    void communicationService.markRead(id!, last?.id);
  }, [messages.data, id]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim();
      if (!body) return;

      const result = await mutateOrEnqueue({
        online: () =>
          communicationService.sendMessage(id!, {
            body,
            parentId: replyTo,
            kind: "TEXT",
          }),
        queue: {
          path: `${COMMUNICATION_API_PREFIX}/conversations/${id}/messages`,
          method: "POST",
          body: { body, parentId: replyTo, kind: "TEXT" },
          label: "Send message",
          invalidateKeys: [queryKeys.communication.messages(id!, 1)],
        },
      });

      if (result.queued) {
        setQueuedNote("Message queued — will send when back online.");
      } else {
        setQueuedNote(null);
      }

      setText("");
      setReplyTo(undefined);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.communication.messages(id!, 1),
      });
    },
  });

  const sendVoice = useMutation({
    mutationFn: async (payload: VoiceAttachmentPayload) => {
      await communicationService.sendMessage(id!, {
        body: "Voice note",
        parentId: replyTo,
        kind: "VOICE",
        attachments: [
          {
            fileName: payload.fileName,
            fileUrl: payload.fileUrl,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            managedFileId: payload.managedFileId,
            durationSeconds: payload.durationSeconds,
            waveformJson: payload.waveformJson,
          },
        ],
      });
      setShowVoice(false);
      setReplyTo(undefined);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.communication.messages(id!, 1),
      });
    },
  });

  const react = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      communicationService.react(messageId, emoji),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.communication.messages(id!, 1),
      });
    },
  });

  function onChangeText(value: string) {
    setText(value);
    if (!perms.canWriteChat) return;
    void communicationService.setTyping(id!, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void communicationService.setTyping(id!, false);
    }, 1200);
  }

  const items = [...(messages.data?.items ?? [])].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={conversation.data?.name || "Conversation"}
        subtitle={conversation.data?.type || "Thread"}
      />

      {messages.isLoading ? <LoadingState /> : null}
      {messages.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load messages."
            onRetry={() => void messages.refetch()}
          />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[3],
            flexGrow: 1,
          }}
          inverted
          removeClippedSubviews
          initialNumToRender={12}
          windowSize={7}
          maxToRenderPerBatch={8}
          ListEmptyComponent={
            !messages.isLoading ? (
              <EmptyState
                icon="chatbubble-outline"
                title="No messages"
                message="Say hello to start the thread."
              />
            ) : null
          }
          renderItem={({ item }) => {
            const voiceAtt =
              item.attachments?.find(
                (a) =>
                  a.mimeType?.startsWith("audio/") ||
                  Boolean(a.durationSeconds) ||
                  Boolean(a.waveformJson),
              ) ?? item.attachments?.[0];

            return (
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius,
                    padding: spacing[3],
                  },
                ]}
              >
                {item.kind === "VOICE" && voiceAtt?.fileUrl ? (
                  <VoicePlayer
                    uri={voiceAtt.fileUrl}
                    durationSeconds={voiceAtt.durationSeconds}
                    waveformJson={voiceAtt.waveformJson}
                  />
                ) : (
                  <Text style={{ color: colors.foreground, lineHeight: 20 }}>
                    {item.body}
                  </Text>
                )}
                {item.parent ? (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Reply
                  </Text>
                ) : null}
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 11,
                    marginTop: 6,
                  }}
                >
                  {formatDateTime(item.createdAt)}
                  {item.isEdited ? " · edited" : ""}
                </Text>

                <View style={styles.actions}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() =>
                        react.mutate({ messageId: item.id, emoji })
                      }
                      hitSlop={6}
                    >
                      <Text style={{ fontSize: 16 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setReplyTo(item.id)} hitSlop={6}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Reply
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />

        <View
          style={{
            padding: spacing[4],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            gap: spacing[2],
          }}
        >
          {replyTo ? (
            <Pressable onPress={() => setReplyTo(undefined)}>
              <Text style={{ color: colors.primary, fontSize: 12 }}>
                Replying — tap to cancel
              </Text>
            </Pressable>
          ) : null}
          {queuedNote ? (
            <Text style={{ color: colors.warning, fontSize: 12 }}>
              {queuedNote}
            </Text>
          ) : null}
          {perms.canWriteChat ? (
            <>
              {showVoice ? (
                <VoiceRecorder
                  disabled={sendVoice.isPending}
                  onCancel={() => setShowVoice(false)}
                  onReady={(payload) => sendVoice.mutate(payload)}
                />
              ) : (
                <>
                  <TextField
                    label="Message"
                    value={text}
                    onChangeText={onChangeText}
                    placeholder="Message… (@mentions supported by backend)"
                  />
                  <View style={styles.composerRow}>
                    <Pressable
                      onPress={() => setShowVoice(true)}
                      style={[
                        styles.micBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="mic-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Send"
                        loading={send.isPending}
                        disabled={!text.trim()}
                        onPress={() => send.mutate()}
                      />
                    </View>
                  </View>
                </>
              )}
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderWidth: 1 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
