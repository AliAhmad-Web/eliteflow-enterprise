import { useQueries } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { dashboardService, notificationsService } from "@/api/dashboard.service";
import { queryKeys } from "@/api/query-keys";
import { useAuthStore } from "@/auth/auth.store";
import { AiAssistantCard } from "@/components/dashboard/AiAssistantCard";
import { CalendarPreview } from "@/components/dashboard/CalendarPreview";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { AppHeader } from "@/components/navigation/AppHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/theme.store";

function formatKpiValue(
  value: string | number | undefined,
  format?: string,
): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  if (format === "currency") {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === "percent") return `${value}%`;
  return new Intl.NumberFormat().format(value);
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.analytics,
        queryFn: () => dashboardService.getAnalytics(),
        retry: false,
      },
      {
        queryKey: queryKeys.projectStats,
        queryFn: () => dashboardService.getProjectStats(),
        retry: false,
      },
      {
        queryKey: queryKeys.taskStats,
        queryFn: () => dashboardService.getTaskStats(),
        retry: false,
      },
      {
        queryKey: queryKeys.upcomingEvents,
        queryFn: () => dashboardService.getUpcomingEvents(),
        retry: false,
      },
      {
        queryKey: queryKeys.unreadCount,
        queryFn: () => notificationsService.unreadCount(),
        retry: false,
      },
    ],
  });

  const [analyticsQ, projectsQ, tasksQ, calendarQ, unreadQ] = results;
  const loading = results.some((q) => q.isLoading);
  const hardFail = results.every((q) => q.isError);

  const revenueKpi = analyticsQ.data?.kpis?.find(
    (k) =>
      k.key.toLowerCase().includes("revenue") ||
      k.label.toLowerCase().includes("revenue"),
  );

  const greeting = user?.firstName ? `Hi, ${user.firstName}` : "Dashboard";

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing[4] }}>
        <AppHeader title={greeting} subtitle="Your mobile command center" />
      </View>

      <View style={{ paddingHorizontal: spacing[4], gap: spacing[6], paddingTop: spacing[4] }}>
        {loading ? <LoadingState message="Loading dashboard…" /> : null}

        {hardFail ? (
          <ErrorState
            message="Could not load dashboard data. Pull to refresh or try again."
            onRetry={() => {
              results.forEach((q) => void q.refetch());
            }}
          />
        ) : null}

        {!loading ? (
          <>
            <View>
              <SectionHeader title="Overview" />
              <View style={[styles.kpiGrid, { gap: spacing[3] }]}>
                <KpiCard
                  label="Revenue"
                  value={formatKpiValue(revenueKpi?.value, revenueKpi?.format)}
                  hint={
                    revenueKpi?.changePercent !== undefined
                      ? `${revenueKpi.changePercent > 0 ? "+" : ""}${revenueKpi.changePercent}%`
                      : undefined
                  }
                  icon="cash-outline"
                  accent={colors.chart1}
                />
                <KpiCard
                  label="Projects"
                  value={formatKpiValue(projectsQ.data?.total ?? analyticsQ.data?.projectStatus?.length)}
                  hint={
                    projectsQ.data
                      ? `${projectsQ.data.inProgress} active`
                      : undefined
                  }
                  icon="briefcase-outline"
                  accent={colors.chart2}
                  onPress={() => router.push("/(app)/projects")}
                />
                <KpiCard
                  label="Tasks"
                  value={formatKpiValue(tasksQ.data?.total)}
                  hint={
                    tasksQ.data
                      ? `${tasksQ.data.overdue} overdue`
                      : undefined
                  }
                  icon="checkbox-outline"
                  accent={colors.chart3}
                  onPress={() => router.push("/(app)/tasks")}
                />
                <KpiCard
                  label="Alerts"
                  value={formatKpiValue(unreadQ.data?.count ?? 0)}
                  hint="Unread"
                  icon="notifications-outline"
                  accent={colors.chart4}
                  onPress={() => router.push("/(app)/(tabs)/notifications")}
                />
              </View>
            </View>

            <View>
              <SectionHeader title="Quick actions" />
              <QuickActions />
            </View>

            <AiAssistantCard />

            <View>
              <SectionHeader
                title="Calendar"
                actionLabel="Open"
                onAction={() => router.push("/(app)/calendar")}
              />
              <CalendarPreview
                events={[
                  ...(calendarQ.data?.today ?? []),
                  ...(calendarQ.data?.upcoming ?? []),
                ]}
              />
            </View>

            {(analyticsQ.isError ||
              projectsQ.isError ||
              tasksQ.isError ||
              calendarQ.isError) &&
            !hardFail ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Some modules could not load — permissions or connectivity may
                limit this view.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
