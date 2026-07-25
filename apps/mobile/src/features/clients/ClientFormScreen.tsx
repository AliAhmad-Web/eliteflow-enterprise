import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClientStatusValue, CreateClientInput } from "@enterprise/shared";

import { clientsService } from "@/api/clients.service";
import { ApiClientError } from "@/api/api-error";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "LEAD" as const, label: "Lead" },
  { value: "ACTIVE" as const, label: "Active" },
  { value: "INACTIVE" as const, label: "Inactive" },
];

interface ClientFormValues {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  city: string;
  country: string;
  status: ClientStatusValue;
  notes: string;
}

const EMPTY: ClientFormValues = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  addressLine1: "",
  city: "",
  country: "",
  status: "LEAD",
  notes: "",
};

interface ClientFormScreenProps {
  mode: "create" | "edit";
  clientId?: string;
  initial?: Partial<ClientFormValues>;
}

export function ClientFormScreen({
  mode,
  clientId,
  initial,
}: ClientFormScreenProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof ClientFormValues) =>
    (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateClientInput = {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };
      if (mode === "create") {
        return clientsService.create(payload);
      }
      if (!clientId) throw new Error("Missing client id");
      return clientsService.update(clientId, payload);
    },
    onSuccess: async (client) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      router.replace(`/(app)/clients/${client.id}`);
    },
    onError: (err) => {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not save client.",
      );
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={mode === "create" ? "Add client" : "Edit client"}
        subtitle="CRM"
      />
      <ScrollView
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: spacing[8],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Company"
          value={form.companyName}
          onChangeText={set("companyName")}
        />
        <TextField
          label="Contact"
          value={form.contactName}
          onChangeText={set("contactName")}
        />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label="Phone"
          value={form.phone}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
        />
        <TextField
          label="Website"
          value={form.website}
          onChangeText={set("website")}
          autoCapitalize="none"
        />
        <TextField
          label="Address"
          value={form.addressLine1}
          onChangeText={set("addressLine1")}
        />
        <TextField label="City" value={form.city} onChangeText={set("city")} />
        <TextField
          label="Country"
          value={form.country}
          onChangeText={set("country")}
        />

        <View style={{ gap: spacing[2] }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Status
          </Text>
          <FilterChips
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(v) => {
              if (v) setForm((p) => ({ ...p, status: v }));
            }}
          />
        </View>

        <TextField
          label="Notes"
          value={form.notes}
          onChangeText={set("notes")}
          multiline
          style={{ minHeight: 96, textAlignVertical: "top" }}
        />

        {error ? (
          <Text style={{ color: colors.destructive }}>{error}</Text>
        ) : null}

        <Button
          title={mode === "create" ? "Create client" : "Save changes"}
          loading={mutation.isPending}
          onPress={() => {
            if (!form.companyName.trim() || !form.contactName.trim() || !form.email.trim()) {
              Alert.alert("Missing fields", "Company, contact, and email are required.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
