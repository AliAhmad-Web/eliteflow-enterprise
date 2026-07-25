import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";

import { mutationQueue, type QueuedMutation } from "@/offline/mutation-queue";
import { useTheme } from "@/theme/theme.store";

export function OfflineBanner() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedMutation[]>([]);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((s) => {
      setOffline(!s.isConnected);
    });
    const unsubQueue = mutationQueue.subscribe(setQueue);
    return () => {
      unsubNet();
      unsubQueue();
    };
  }, []);

  if (!offline && queue.length === 0) return null;

  return (
    <Pressable
      onPress={() => router.push("/(app)/offline-queue")}
      style={[
        styles.banner,
        {
          backgroundColor: offline ? colors.warning : colors.info,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
        },
      ]}
    >
      <Text style={styles.text}>
        {offline
          ? `Offline${queue.length ? ` · ${queue.length} queued` : ""}`
          : `${queue.length} change(s) waiting to sync`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
  },
  text: {
    color: "#111",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
});
