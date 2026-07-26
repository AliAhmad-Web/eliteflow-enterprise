import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { setAudioModeAsync } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import { filesService } from "@/api/files.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  shareLocalFile,
  useDownloadStore,
} from "@/features/files/download-manager";
import { VoicePlayer } from "@/features/communication/VoiceNote";
import { useTheme } from "@/theme/theme.store";

type PreviewKind = "image" | "video" | "audio" | "pdf" | "other";

function detectKind(mimeType?: string, name?: string): PreviewKind {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "m4a", "wav", "aac"].includes(ext)) {
    return "audio";
  }
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  return "other";
}

function InlineVideoPreview({
  uri,
  style,
}: {
  uri: string;
  style: StyleProp<ViewStyle>;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      contentFit="contain"
    />
  );
}

export default function FilePreviewScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const download = useDownloadStore((s) => s.download);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const meta = useQuery({
    queryKey: queryKeys.files.detail(id!),
    queryFn: () => filesService.getById(id!),
    enabled: Boolean(id),
  });

  const kind = useMemo(
    () => detectKind(meta.data?.mimeType, meta.data?.name ?? name),
    [meta.data, name],
  );

  const remoteUrl = id ? filesService.downloadUrl(id).url : "";

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!id || !meta.data) return;
      setLoadingLocal(true);
      const uri = await download(id, meta.data.name || name || "file");
      if (!cancelled) {
        setLocalUri(uri);
        setLoadingLocal(false);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [id, meta.data?.id]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  async function openExternally() {
    if (localUri) {
      const can = await Linking.canOpenURL(localUri);
      if (can) {
        await Linking.openURL(localUri);
        return;
      }
      await shareLocalFile(localUri);
      return;
    }
    if (remoteUrl) {
      await WebBrowser.openBrowserAsync(remoteUrl);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={meta.data?.name || name || "Preview"}
        subtitle={kind.toUpperCase()}
        right={
          <Pressable
            hitSlop={8}
            onPress={() => {
              if (localUri) void shareLocalFile(localUri);
            }}
          >
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </Pressable>
        }
      />

      {meta.isLoading || loadingLocal ? <LoadingState /> : null}
      {meta.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load file metadata."
            onRetry={() => void meta.refetch()}
          />
        </View>
      ) : null}

      {!meta.isLoading && meta.data ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[4],
            flexGrow: 1,
          }}
        >
          {kind === "image" && localUri ? (
            <Image
              source={{ uri: localUri }}
              style={{
                width: "100%",
                height: Dimensions.get("window").height * 0.55,
                borderRadius: radius,
                backgroundColor: colors.muted,
              }}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : null}

          {kind === "video" && localUri ? (
            <InlineVideoPreview
              uri={localUri}
              style={{
                width: "100%",
                height: 260,
                backgroundColor: "#000",
                borderRadius: radius,
              }}
            />
          ) : null}

          {kind === "audio" && localUri ? (
            <VoicePlayer uri={localUri} />
          ) : null}

          {kind === "pdf" ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[4],
                  gap: spacing[3],
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                PDF ready
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Open with the device PDF viewer or share sheet for native
                preview.
              </Text>
              <Button title="Open PDF" onPress={() => void openExternally()} />
            </View>
          ) : null}

          {kind === "other" ? (
            <EmptyState
              icon="document-outline"
              title="No inline preview"
              message="Download completed — use Share to open in another app."
            />
          ) : null}

          {loadingLocal ? (
            <ActivityIndicator color={colors.primary} />
          ) : null}

          <View style={{ gap: spacing[2] }}>
            <Button
              title="Share"
              variant="secondary"
              disabled={!localUri}
              onPress={() => localUri && void shareLocalFile(localUri)}
            />
            <Button
              title="Open externally"
              variant="secondary"
              onPress={() => void openExternally()}
            />
          </View>

          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {meta.data.mimeType} ·{" "}
            {Math.round((meta.data.sizeBytes || 0) / 1024)} KB
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
