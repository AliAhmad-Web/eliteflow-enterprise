import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { calendarService } from "@/api/calendar.service";
import { queryKeys } from "@/api/query-keys";
import { ApiClientError } from "@/api/api-error";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

function defaultRange() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export default function CreateCalendarEventScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const qc = useQueryClient();
  const defaults = defaultRange();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);

  const create = useMutation({
    mutationFn: () =>
      calendarService.createEvent({
        title: title.trim(),
        description: null,
        notes: null,
        location: location.trim() || null,
        startsAt,
        endsAt,
        type: "EVENT",
        status: "SCHEDULED",
        category: "WORK",
        color: "#2563eb",
        allDay: false,
        isPrivate: false,
        recurrenceFrequency: "NONE",
        recurrenceInterval: 1,
        recurrenceUntil: null,
        recurrenceCount: null,
        attachmentUrls: [],
        projectId: null,
        taskId: null,
        clientId: null,
        attendeeUserIds: [],
        attendees: [],
        reminders: [],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
      Alert.alert("Created", "Calendar event saved.");
      router.back();
    },
    onError: (err) => {
      Alert.alert(
        "Unable to create",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  if (!perms.canWriteCalendar) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="New event" onBack={() => router.back()} />
        <View style={{ padding: spacing[4] }}>
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="New event" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Location"
          value={location}
          onChangeText={setLocation}
        />
        <TextField
          label="Starts at (ISO)"
          value={startsAt}
          onChangeText={setStartsAt}
          autoCapitalize="none"
        />
        <TextField
          label="Ends at (ISO)"
          value={endsAt}
          onChangeText={setEndsAt}
          autoCapitalize="none"
        />
        <Button
          title="Create event"
          loading={create.isPending}
          disabled={!title.trim()}
          onPress={() => create.mutate()}
        />
      </ScrollView>
    </View>
  );
}
