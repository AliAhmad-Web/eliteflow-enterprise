import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { billingService } from "@/api/billing.service";
import { invoicesService } from "@/api/invoices.service";
import { projectsService } from "@/api/projects.service";
import { queryKeys } from "@/api/query-keys";
import { tasksService } from "@/api/tasks.service";
import { useAuthStore } from "@/auth/auth.store";
import { AppHeader } from "@/components/navigation/AppHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function PortalHomeScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const perms = usePermissions();

  const projects = useQuery({
    queryKey: queryKeys.projects.list({ portal: true }),
    queryFn: () =>
      projectsService.list({
        page: 1,
        limit: 5,
        sortBy: "updatedAt",
        sortOrder: "desc",
        search: "",
      }),
    enabled: perms.canReadProjects,
  });

  const tasks = useQuery({
    queryKey: queryKeys.tasks.list({ portal: true }),
    queryFn: () =>
      tasksService.list({
        page: 1,
        limit: 5,
        sortBy: "updatedAt",
        sortOrder: "desc",
        search: "",
      }),
    enabled: perms.canReadTasks,
  });

  const invoices = useQuery({
    queryKey: queryKeys.invoices.list({ portal: true }),
    queryFn: () =>
      invoicesService.list({
        page: 1,
        limit: 5,
        sortBy: "updatedAt",
        sortOrder: "desc",
        search: "",
      }),
    enabled: perms.canReadInvoices,
  });

  const billing = useQuery({
    queryKey: queryKeys.billing.subscription,
    queryFn: () => billingService.getSubscription(),
  });

  const loading = projects.isLoading || tasks.isLoading || invoices.isLoading;
  const errored = projects.isError || tasks.isError || invoices.isError;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Client Portal"
        subtitle={user?.companyId ? "Your company workspace" : "Portal"}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
      >
        {loading ? <LoadingState message="Loading portal…" /> : null}
        {errored ? (
          <ErrorState
            title="Unable to load portal"
            message="Check your connection and try again."
            onRetry={() => {
              void projects.refetch();
              void tasks.refetch();
              void invoices.refetch();
            }}
          />
        ) : null}

        {billing.data?.subscription ? (
          <View
            style={{
              borderRadius: radius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: spacing[4],
              gap: spacing[1],
            }}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Subscription
            </Text>
            <Text
              style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}
            >
              {billing.data.subscription.planName ||
                billing.data.subscription.planCode}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Status: {billing.data.subscription.status}
              {billing.data.subscription.paymentsEnabled
                ? ""
                : " · Payments disabled"}
            </Text>
          </View>
        ) : null}

        <PortalSection
          title="Projects"
          count={projects.data?.pagination.total}
          onPress={() => router.push("/(app)/projects")}
        />
        <PortalSection
          title="Tasks"
          count={tasks.data?.pagination.total}
          onPress={() => router.push("/(app)/tasks")}
        />
        <PortalSection
          title="Invoices"
          count={invoices.data?.pagination.total}
          onPress={() => router.push("/(app)/invoices")}
        />
        <PortalSection
          title="Billing"
          onPress={() => router.push("/(app)/billing")}
        />
        <PortalSection
          title="Files"
          onPress={() => router.push("/(app)/files")}
        />
        <PortalSection
          title="Messages"
          onPress={() => router.push("/(app)/communication")}
        />
        <PortalSection
          title="Notifications"
          onPress={() => router.push("/(app)/(tabs)/notifications")}
        />
        <PortalSection
          title="Profile & security"
          onPress={() => router.push("/(app)/settings")}
        />
      </ScrollView>
    </View>
  );
}

function PortalSection({
  title,
  count,
  onPress,
}: {
  title: string;
  count?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: spacing[4],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}
        >
          {title}
        </Text>
        {typeof count === "number" ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>
            {count} total
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </Pressable>
  );
}
