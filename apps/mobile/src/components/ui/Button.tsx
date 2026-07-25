import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme/theme.store";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;

  const containerStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: "transparent",
    },
    destructive: {
      backgroundColor: colors.destructive,
    },
  };

  const textStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: colors.primaryForeground },
    secondary: { color: colors.secondaryForeground },
    ghost: { color: colors.primary },
    destructive: { color: colors.destructiveForeground },
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius,
          paddingVertical: spacing[3] + 2,
          paddingHorizontal: spacing[4],
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        containerStyles[variant],
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textStyles[variant].color as string} />
      ) : (
        <Text style={[styles.label, textStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
