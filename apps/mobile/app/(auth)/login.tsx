import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { authService } from "@/api/auth.service";
import { ApiClientError } from "@/api/api-error";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/theme.store";

export default function LoginScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (otpSessionId) {
        await authService.verifyOtp({ otpSessionId, code: otpCode.trim() });
        router.replace("/(app)/(tabs)");
        return;
      }

      const result = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.requiresOtp && result.otpSessionId) {
        setOtpSessionId(result.otpSessionId);
        return;
      }

      router.replace("/(app)/(tabs)");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Unable to sign in. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={{ paddingTop: spacing[8], gap: spacing[6] }}>
          <View>
            <Text style={[styles.brand, { color: colors.primary }]}>
              EliteFlow
            </Text>
            <Text style={[styles.headline, { color: colors.foreground }]}>
              {otpSessionId ? "Verify your identity" : "Sign in"}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {otpSessionId
                ? "Enter the one-time code sent to your email."
                : "Access your workspace with the same account as the web app."}
            </Text>
          </View>

          <View style={{ gap: spacing[4] }}>
            {otpSessionId ? (
              <TextField
                label="Verification code"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
              />
            ) : (
              <>
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                />
              </>
            )}

            {error ? (
              <Text style={{ color: colors.destructive, fontSize: 14 }}>
                {error}
              </Text>
            ) : null}

            <Button
              title={otpSessionId ? "Verify & continue" : "Sign in"}
              loading={loading}
              onPress={() => void onSubmit()}
            />

            {!otpSessionId ? (
              <Link href="/(auth)/forgot-password">
                <Text style={[styles.link, { color: colors.primary }]}>
                  Forgot password?
                </Text>
              </Link>
            ) : (
              <Button
                title="Back to sign in"
                variant="ghost"
                onPress={() => {
                  setOtpSessionId(null);
                  setOtpCode("");
                  setError(null);
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headline: {
    marginTop: 12,
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
    marginTop: 4,
  },
});
