import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";

import { FILES_API_PREFIX } from "@enterprise/shared";

import { getApiBaseUrl } from "@/api/api-error";
import { filesService } from "@/api/files.service";
import { useTheme } from "@/theme/theme.store";

export type VoiceAttachmentPayload = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  managedFileId: string;
  durationSeconds: number;
  waveformJson: string;
};

interface VoiceRecorderProps {
  onReady: (payload: VoiceAttachmentPayload) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

/** Sample metering into a compact waveform JSON array (0–1). */
function buildWaveform(samples: number[]): string {
  const max = Math.max(...samples, 0.01);
  const normalized = samples.map((s) => Math.round((s / max) * 100) / 100);
  return JSON.stringify(normalized.slice(-48));
}

export function VoiceRecorder({
  onReady,
  onCancel,
  disabled,
}: VoiceRecorderProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.15));
  const samplesRef = useRef<number[]>([]);

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const isRecording = recorderState.isRecording;
  const seconds = Math.floor(recorderState.durationMillis / 1000);

  useEffect(() => {
    if (!isRecording) return;
    const meter =
      typeof recorderState.metering === "number"
        ? Math.max(0, (recorderState.metering + 60) / 60)
        : 0.3 + Math.random() * 0.4;
    samplesRef.current.push(meter);
    setLevels((prev) => [...prev.slice(1), meter]);
  }, [isRecording, recorderState.metering, recorderState.durationMillis]);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    samplesRef.current = [];
    setLevels(Array(24).fill(0.15));
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stopAndUpload = useCallback(async () => {
    if (!isRecording) return;

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;

      const durationSeconds = Math.max(
        1,
        Math.round(recorderState.durationMillis / 1000) || seconds || 1,
      );
      const waveformJson = buildWaveform(samplesRef.current);

      setUploading(true);
      setProgress(0.1);
      const uploaded = await filesService.upload({
        uris: [
          {
            uri,
            name: `voice-${Date.now()}.m4a`,
            mimeType: "audio/m4a",
          },
        ],
        onProgress: setProgress,
      });
      const file = uploaded[0];
      if (!file) throw new Error("Upload returned no file");

      const fileUrl = `${getApiBaseUrl()}${FILES_API_PREFIX}/${file.id}/download`;

      onReady({
        fileName: file.name,
        fileUrl,
        mimeType: file.mimeType || "audio/m4a",
        sizeBytes: file.sizeBytes,
        managedFileId: file.id,
        durationSeconds,
        waveformJson,
      });
    } finally {
      setUploading(false);
      setProgress(0);
      await setAudioModeAsync({ allowsRecording: false });
    }
  }, [isRecording, recorder, recorderState.durationMillis, seconds, onReady]);

  const cancel = useCallback(async () => {
    if (isRecording) {
      await recorder.stop();
    }
    await setAudioModeAsync({ allowsRecording: false });
    onCancel?.();
  }, [isRecording, recorder, onCancel]);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius,
          padding: spacing[3],
          gap: spacing[3],
        },
      ]}
    >
      <View style={styles.waveRow}>
        {levels.map((level, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: 8 + level * 28,
              borderRadius: 2,
              backgroundColor: isRecording ? colors.destructive : colors.primary,
              opacity: 0.35 + level * 0.65,
            }}
          />
        ))}
      </View>

      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
        {isRecording
          ? `Recording ${seconds}s`
          : uploading
            ? `Uploading ${Math.round(progress * 100)}%`
            : "Hold mic to capture a voice note"}
      </Text>

      {uploading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.actions}>
          {isRecording ? (
            <>
              <Pressable onPress={() => void cancel()}>
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void stopAndUpload()}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={colors.primaryForeground}
                />
              </Pressable>
            </>
          ) : (
            <Pressable
              disabled={disabled}
              onPress={() => void start()}
              style={[
                styles.mic,
                {
                  backgroundColor: colors.destructive,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="mic" size={22} color="#fff" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

interface VoicePlayerProps {
  uri: string;
  durationSeconds?: number | null;
  waveformJson?: string | null;
}

export function VoicePlayer({
  uri,
  durationSeconds,
  waveformJson,
}: VoicePlayerProps) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const bars = (() => {
    try {
      if (!waveformJson) return Array(24).fill(0.35);
      const parsed = JSON.parse(waveformJson) as number[];
      return parsed.length ? parsed.slice(0, 32) : Array(24).fill(0.35);
    } catch {
      return Array(24).fill(0.35);
    }
  })();

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  async function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }

    await setAudioModeAsync({ playsInSilentMode: true });
    if (status.didJustFinish) {
      await player.seekTo(0);
    }
    player.play();
  }

  return (
    <View
      style={[
        styles.player,
        {
          backgroundColor: colors.muted,
          borderRadius: radius - 2,
          padding: spacing[3],
        },
      ]}
    >
      <Pressable onPress={() => void toggle()} hitSlop={8}>
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={22}
          color={colors.primary}
        />
      </Pressable>
      <View style={styles.waveRow}>
        {bars.map((level, i) => (
          <View
            key={i}
            style={{
              width: 2.5,
              height: 6 + Number(level) * 22,
              borderRadius: 2,
              backgroundColor: colors.primary,
              opacity: 0.4 + Number(level) * 0.6,
            }}
          />
        ))}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, minWidth: 36 }}>
        {Math.round(status.currentTime)}s
        {durationSeconds ? ` / ${durationSeconds}s` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1 },
  waveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 40,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
});
