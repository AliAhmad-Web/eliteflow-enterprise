import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/theme/theme.store";

/**
 * Brief branded launch pulse after native splash hides.
 * Kept lightweight — does not redesign product chrome.
 */
export function LaunchAnimation({ onDone }: { onDone?: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const exit = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 });
    scale.value = withTiming(1, { duration: 520 });
    exit.value = withDelay(
      900,
      withTiming(0, { duration: 320 }, (finished) => {
        if (finished && onDone) {
          // runOnJS not required — caller typically unmounts via state after timeout
        }
      }),
    );
    const t = setTimeout(() => onDone?.(), 1300);
    return () => clearTimeout(t);
  }, [opacity, scale, exit, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value * exit.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <Animated.View style={style}>
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
