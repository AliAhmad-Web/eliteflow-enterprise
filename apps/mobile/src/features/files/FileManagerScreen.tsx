import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";

import { filesService } from "@/api/files.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TextField } from "@/components/ui/TextField";
import { useDownloadStore } from "@/features/files/download-manager";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

const VIEWS = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "favorites", label: "Favorites" },
  { value: "shared", label: "Shared" },
  { value: "trash", label: "Trash" },
];

export default function FileManagerScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();
  const search = useSearchQuery();
  const download = useDownloadStore((s) => s.download);
  const [view, setView] = useState("all");
  const [folderId, setFolderId] = useState<string | undefined>();
  const [parentStack, setParentStack] = useState<string[]>(["root"]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const currentParent = parentStack[parentStack.length - 1] ?? "root";

  const folders = useQuery({
    queryKey: queryKeys.files.folders(currentParent),
    queryFn: () => filesService.listFolders(currentParent as "root" | string),
    enabled: perms.canReadFiles,
  });

  const filters = useMemo(
    () => ({
      folderId,
      search: search.query,
      view,
      page: 1,
    }),
    [folderId, search.query, view],
  );

  const files = useQuery({
    queryKey: queryKeys.files.list(filters),
    queryFn: () =>
      filesService.listFiles({
        folderId,
        search: search.query,
        view,
        page: 1,
        limit: 40,
      }),
    enabled: perms.canReadFiles,
  });

  async function uploadFiles(
    assets: Array<{ uri: string; name: string; mimeType?: string }>,
  ) {
    if (!assets.length) return;
    try {
      setUploadProgress(0.05);
      await filesService.upload({
        uris: assets,
        folderId,
        onProgress: setUploadProgress,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      Alert.alert("Uploaded", `${assets.length} file(s) uploaded.`);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setUploadProgress(null);
    }
  }

  async function pickDocuments() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    await uploadFiles(
      result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType ?? undefined,
      })),
    );
  }

  async function pickGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    await uploadFiles(
      result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName || `gallery-${i}.jpg`,
        mimeType: a.mimeType ?? "image/jpeg",
      })),
    );
  }

  async function pickCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to upload.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    await uploadFiles([
      {
        uri: asset.uri,
        name: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      },
    ]);
  }

  async function shareFile(id: string, name: string) {
    try {
      const localUri = await download(id, name);
      if (!localUri) throw new Error("Download failed");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert("Downloaded", `Saved to cache: ${name}`);
      }
    } catch (err) {
      Alert.alert(
        "Share failed",
        err instanceof Error ? err.message : "Could not download file.",
      );
    }
  }

  if (!perms.canReadFiles) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Files" />
        <EmptyState
          icon="lock-closed-outline"
          title="No access"
          message="files:read permission required."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Files"
        subtitle="Manager"
        right={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              hitSlop={8}
              onPress={() => router.push("/(app)/files/downloads")}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={colors.primary}
              />
            </Pressable>
            {perms.canUploadFiles ? (
              <>
                <Pressable hitSlop={8} onPress={() => void pickCamera()}>
                  <Ionicons
                    name="camera-outline"
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
                <Pressable hitSlop={8} onPress={() => void pickGallery()}>
                  <Ionicons
                    name="images-outline"
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
                <Pressable hitSlop={8} onPress={() => void pickDocuments()}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
              </>
            ) : null}
          </View>
        }
      />

      <View style={{ paddingHorizontal: spacing[4], gap: spacing[3], flex: 1 }}>
        <FilterChips
          options={VIEWS}
          value={view}
          onChange={(v) => v && setView(v)}
        />
        <TextField
          label="Search"
          value={search.value}
          onChangeText={search.setValue}
          autoCapitalize="none"
        />

        {parentStack.length > 1 ? (
          <Pressable
            onPress={() => {
              const next = parentStack.slice(0, -1);
              setParentStack(next);
              const parent = next[next.length - 1];
              setFolderId(parent === "root" ? undefined : parent);
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              ← Up one folder
            </Text>
          </Pressable>
        ) : null}

        {uploadProgress != null ? (
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Uploading… {Math.round(uploadProgress * 100)}%
            </Text>
            <View
              style={{
                height: 6,
                backgroundColor: colors.muted,
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.round(uploadProgress * 100)}%`,
                  height: "100%",
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          </View>
        ) : null}

        {folders.isLoading || files.isLoading ? <ListSkeleton /> : null}
        {files.isError ? (
          <ErrorState
            message="Could not load files."
            onRetry={() => void files.refetch()}
          />
        ) : null}

        <FlashList
          data={[
            ...(folders.data?.items ?? []).map((f) => ({
              kind: "folder" as const,
              id: f.id,
              name: f.name,
            })),
            ...(files.data?.items ?? []).map((f) => ({
              kind: "file" as const,
              id: f.id,
              name: f.name,
              meta: `${f.category || "FILE"} · ${formatDate(f.updatedAt)}`,
              previewable: f.previewable,
            })),
          ]}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          ListEmptyComponent={
            !files.isLoading ? (
              <EmptyState
                icon="folder-open-outline"
                title="No files"
                message="Upload from camera, gallery, or documents."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.kind === "folder") {
                  setParentStack((s) => [...s, item.id]);
                  setFolderId(item.id);
                  return;
                }
                Alert.alert(item.name, "Choose an action", [
                  {
                    text: "Preview",
                    onPress: () =>
                      router.push({
                        pathname: "/(app)/files/[id]",
                        params: { id: item.id, name: item.name },
                      }),
                  },
                  {
                    text: "Share / Download",
                    onPress: () => void shareFile(item.id, item.name),
                  },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
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
              <Ionicons
                name={item.kind === "folder" ? "folder" : "document-outline"}
                size={22}
                color={colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.foreground, fontWeight: "700" }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {"meta" in item && item.meta ? (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {item.meta}
                  </Text>
                ) : null}
              </View>
              {uploadProgress != null ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.mutedForeground}
                />
              )}
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
    gap: 12,
  },
});
