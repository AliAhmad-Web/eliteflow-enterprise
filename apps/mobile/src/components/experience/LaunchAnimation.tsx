import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

/**
 * Brief branded launch pulse after native splash hides.
 * Uses RN Animated (not Reanimated) so cold-start never depends on
 * worklets native init — a known silent-crash vector with expo-updates
 * error recovery on Android release builds.
 */
export function LaunchAnimation({ onDone }: { onDone?: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
    ]);

    const exit = Animated.timing(opacity, {
      toValue: 0,
      duration: 320,
      delay: 900,
      useNativeDriver: true,
    });

    const sequence = Animated.sequence([enter, exit]);
    sequence.start(({ finished }) => {
      if (finished) onDone?.();
    });

    const fallback = setTimeout(() => onDone?.(), 1400);
    return () => {
      sequence.stop();
      clearTimeout(fallback);
    };
  }, [opacity, scale, onDone]);

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Text style={[styles.brand, { color: colors.primary }]}>EliteFlow</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Enterprise workspace
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
});
