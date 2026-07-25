import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";

import { communicationService } from "@/api/communication.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

type HubTab =
  | "messages"
  | "channels"
  | "threads"
  | "announcements"
  | "meetings"
  | "activity";

const TABS: Array<{ value: HubTab; label: string }> = [
  { value: "messages", label: "Messages" },
  { value: "channels", label: "Channels" },
  { value: "threads", label: "Threads" },
  { value: "announcements", label: "Announce" },
  { value: "meetings", label: "Meetings" },
  { value: "activity", label: "Activity" },
];

export default function CommunicationHubScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const search = useSearchQuery();
  const [tab, setTab] = useState<HubTab>("messages");

  const enabled = perms.canReadChat || perms.canReadCommunication;

  const conversations = useQuery({
    queryKey: queryKeys.communication.conversations({
      search: search.query,
      tab,
    }),
    queryFn: () =>
      tab === "channels"
        ? communicationService.listChannels({
            page: 1,
            pageSize: 40,
            search: search.query,
          })
        : communicationService.listConversations({
            page: 1,
            pageSize: 40,
            search: search.query,
          }),
    enabled: enabled && (tab === "messages" || tab === "channels"),
  });

  const announcements = useQuery({
    queryKey: queryKeys.communication.announcements,
    queryFn: () => communicationService.listAnnouncements({ page: 1 }),
    enabled: enabled && tab === "announcements",
  });

  const threads = useQuery({
    queryKey: queryKeys.communication.threads,
    queryFn: () => communicationService.listThreads({ page: 1 }),
    enabled: enabled && tab === "threads",
  });

  const meetings = useQuery({
    queryKey: queryKeys.communication.meetings,
    queryFn: () => communicationService.listMeetings({ page: 1 }),
    enabled: enabled && tab === "meetings",
  });

  const activities = useQuery({
    queryKey: queryKeys.communication.activities,
    queryFn: () =>
      communicationService.listActivities({ page: 1, search: search.query }),
    enabled: enabled && tab === "activity",
  });

  if (!enabled) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Communication" />
        <EmptyState
          icon="lock-closed-outline"
          title="No access"
          message="Chat/communication permissions required."
        />
      </View>
    );
  }

  const loading =
    (tab === "messages" || tab === "channels"
      ? conversations.isLoading
      : false) ||
    (tab === "announcements" && announcements.isLoading) ||
    (tab === "threads" && threads.isLoading) ||
    (tab === "meetings" && meetings.isLoading) ||
    (tab === "activity" && activities.isLoading);

  const errored =
    conversations.isError ||
    announcements.isError ||
    threads.isError ||
    meetings.isError ||
    activities.isError;

  type Row = {
    id: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  };

  let rows: Row[] = [];
  if (tab === "messages" || tab === "channels") {
    rows = (conversations.data?.items ?? []).map((c) => ({
      id: c.id,
      title: c.name || c.type || "Conversation",
      subtitle: `${c.type} · ${formatDateTime(c.updatedAt)}`,
      onPress: () => router.push(`/(app)/communication/${c.id}`),
    }));
  } else if (tab === "announcements") {
    rows = (announcements.data?.items ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: formatDateTime(a.createdAt),
      onPress: () => undefined,
    }));
  } else if (tab === "threads") {
    rows = (threads.data?.items ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.status || formatDateTime(t.createdAt),
      onPress: () => undefined,
    }));
  } else if (tab === "meetings") {
    rows = (meetings.data?.items ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      subtitle: formatDateTime(m.scheduledStart),
      onPress: () => undefined,
    }));
  } else {
    rows = (activities.data?.items ?? []).map((a) => ({
      id: a.id,
      title: a.message || a.action,
      subtitle: formatDateTime(a.createdAt),
      onPress: () => undefined,
    }));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Communication" subtitle="Hub" />
      <View style={{ paddingHorizontal: spacing[4], gap: spacing[3], flex: 1 }}>
        <FilterChips options={TABS} value={tab} onChange={(v) => v && setTab(v)} />
        <TextField
          label="Search"
          value={search.value}
          onChangeText={search.setValue}
          autoCapitalize="none"
        />

        {loading ? <ListSkeleton rows={5} /> : null}
        {errored && !loading ? (
          <ErrorState message="Could not load communication data." />
        ) : null}

        <FlashList
          data={rows}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="chatbubbles-outline"
                title="Nothing here"
                message="Conversations and updates will appear in this hub."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={item.onPress}
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[4],
                  marginBottom: spacing[2],
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.foreground, fontWeight: "700" }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}
                >
                  {item.subtitle}
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
