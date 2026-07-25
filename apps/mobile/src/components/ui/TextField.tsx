import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useTheme } from "@/theme/theme.store";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: colors.mutedForeground, marginBottom: spacing[2] },
        ]}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: error
              ? colors.destructive
              : focused
                ? colors.ring
                : colors.input,
            borderRadius: radius,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3] + 2,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
});
