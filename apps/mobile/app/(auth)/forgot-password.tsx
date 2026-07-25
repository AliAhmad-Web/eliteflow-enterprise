import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { authService } from "@/api/auth.service";
import { ApiClientError } from "@/api/api-error";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/theme.store";

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await authService.forgotPassword({
        email: email.trim().toLowerCase(),
      });
      setSuccess(
        result.message ||
          "If an account exists for that email, reset instructions were sent.",
      );
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Unable to send reset email. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingTop: spacing[8], gap: spacing[6] }}>
        <View>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Reset password
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We will email you a secure link to choose a new password.
          </Text>
        </View>

        <View style={{ gap: spacing[4] }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {error ? (
            <Text style={{ color: colors.destructive, fontSize: 14 }}>
              {error}
            </Text>
          ) : null}
          {success ? (
            <Text style={{ color: colors.success, fontSize: 14 }}>
              {success}
            </Text>
          ) : null}

          <Button
            title="Send reset link"
            loading={loading}
            onPress={() => void onSubmit()}
          />

          <Link href="/(auth)/login">
            <Text style={[styles.link, { color: colors.primary }]}>
              Back to sign in
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
});
