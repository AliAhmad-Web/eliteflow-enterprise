import { Alert, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { billingService } from "@/api/billing.service";
import { queryKeys } from "@/api/query-keys";
import { ApiClientError } from "@/api/api-error";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function BillingScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const perms = usePermissions();
  const qc = useQueryClient();

  const subscriptionQ = useQuery({
    queryKey: queryKeys.billing.subscription,
    queryFn: () => billingService.getSubscription(),
  });

  const plansQ = useQuery({
    queryKey: queryKeys.billing.plans,
    queryFn: () => billingService.listPlans(),
    enabled: perms.canManageSettings,
  });

  const cancel = useMutation({
    mutationFn: () => billingService.cancelSubscription({ atPeriodEnd: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.billing.subscription });
      Alert.alert("Scheduled", "Cancellation at period end requested.");
    },
    onError: (err) => {
      Alert.alert(
        "Unable to cancel",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  const reactivate = useMutation({
    mutationFn: () => billingService.reactivateSubscription(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.billing.subscription });
      Alert.alert("Reactivated", "Subscription cancellation was cleared.");
    },
    onError: (err) => {
      Alert.alert(
        "Unable to reactivate",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  const sub = subscriptionQ.data?.subscription;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Billing" subtitle="Subscription status" />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
      >
        {subscriptionQ.isLoading ? (
          <LoadingState message="Loading subscription…" />
        ) : null}
        {subscriptionQ.isError ? (
          <ErrorState
            message="Could not load billing status."
            onRetry={() => void subscriptionQ.refetch()}
          />
        ) : null}

        {sub ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              borderRadius: radius,
              padding: spacing[4],
              gap: spacing[2],
            }}
          >
            <Text
              style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}
            >
              {sub.planName || sub.planCode}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              Status: {sub.status}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              Seats: {sub.seatsUsed}/{sub.seatsIncluded}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              Period ends: {sub.currentPeriodEnd ?? "—"}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              Stripe mode: {sub.stripeMode}
              {sub.paymentsEnabled ? "" : " · Live payments not enabled"}
            </Text>
            {sub.cancelAtPeriodEnd ? (
              <Text style={{ color: colors.destructive }}>
                Cancels at period end
              </Text>
            ) : null}
          </View>
        ) : null}

        {perms.canManageSettings && sub?.paymentsEnabled ? (
          <View style={{ gap: spacing[2] }}>
            {sub.cancelAtPeriodEnd ? (
              <Button
                title="Reactivate subscription"
                loading={reactivate.isPending}
                onPress={() => reactivate.mutate()}
              />
            ) : (
              <Button
                title="Cancel at period end"
                variant="destructive"
                loading={cancel.isPending}
                onPress={() =>
                  Alert.alert(
                    "Cancel subscription?",
                    "Access continues until the current period ends.",
                    [
                      { text: "Keep", style: "cancel" },
                      {
                        text: "Cancel plan",
                        style: "destructive",
                        onPress: () => cancel.mutate(),
                      },
                    ],
                  )
                }
              />
            )}
          </View>
        ) : perms.canManageSettings && sub && !sub.paymentsEnabled ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Stripe payments are disabled in this environment. Cancel/reactivate
            requires a live or test Stripe subscription.
          </Text>
        ) : null}

        {perms.canManageSettings && plansQ.data?.plans?.length ? (
          <View style={{ gap: spacing[2] }}>
            <Text
              style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}
            >
              Plans
            </Text>
            {plansQ.data.plans.map((plan) => (
              <View
                key={plan.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[3],
                  backgroundColor: colors.card,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  {plan.name}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {plan.code} · {plan.seatsIncluded} seats
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
