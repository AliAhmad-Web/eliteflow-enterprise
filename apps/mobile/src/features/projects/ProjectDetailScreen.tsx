import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { projectsService } from "@/api/projects.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar, StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  const detail = useQuery({
    queryKey: queryKeys.projects.detail(id!),
    queryFn: () => projectsService.getById(id!),
    enabled: Boolean(id),
  });

  const project = detail.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={project?.name ?? "Project"}
        subtitle={project?.clientName ?? "Details"}
      />

      {detail.isLoading ? <LoadingState /> : null}
      {detail.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load project."
            onRetry={() => void detail.refetch()}
          />
        </View>
      ) : null}

      {project ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[5],
            paddingBottom: spacing[8],
          }}
        >
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
            <View style={styles.row}>
              <StatusBadge label={project.status} tone="info" />
              <StatusBadge label={project.priority} tone="warning" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {project.name}
            </Text>
            {project.description ? (
              <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
                {project.description}
              </Text>
            ) : null}
            <ProgressBar value={project.progress} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {project.progress}% complete
            </Text>
          </View>

          <Section title="Timeline" colors={colors}>
            <Meta label="Start" value={formatDate(project.startDate)} colors={colors} />
            <Meta label="Due" value={formatDate(project.dueDate)} colors={colors} />
            <Meta
              label="Budget"
              value={
                project.budget != null
                  ? new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(Number(project.budget))
                  : "—"
              }
              colors={colors}
            />
          </Section>

          <Section title="Team" colors={colors}>
            {project.members?.length ? (
              project.members.map((m) => (
                <View key={m.id} style={styles.member}>
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                    {m.firstName} {m.lastName}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {m.roleLabel || m.email}
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState
                icon="people-outline"
                title="No team members"
                message="Assignees will appear here."
              />
            )}
          </Section>

          <Section title="Milestones" colors={colors}>
            {project.milestones?.length ? (
              [...project.milestones]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((ms) => (
                  <View
                    key={ms.id}
                    style={[
                      styles.milestone,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.muted,
                        borderRadius: radius - 2,
                        padding: spacing[3],
                      },
                    ]}
                  >
                    <View style={styles.row}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontWeight: "700",
                          flex: 1,
                        }}
                      >
                        {ms.title}
                      </Text>
                      <StatusBadge label={ms.status} />
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Due {formatDate(ms.dueDate)}
                    </Text>
                  </View>
                ))
            ) : (
              <EmptyState
                icon="flag-outline"
                title="No milestones"
                message="Milestones will show when added on the project."
              />
            )}
          </Section>
        </ScrollView>
      ) : null}
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: { foreground: string };
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700" }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Meta({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { mutedForeground: string; foreground: string };
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={{ color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  member: { gap: 2, marginBottom: 8 },
  milestone: { borderWidth: 1, marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
