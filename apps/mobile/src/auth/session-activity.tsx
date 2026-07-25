/**
 * Optional activity touch for session timeout.
 * Wrap interactive screens or call `useBiometricStore.getState().touch()` on focus.
 */
import { useEffect } from "react";
import { AppState, Pressable, type PressableProps } from "react-native";

import { useBiometricStore } from "@/auth/biometric.store";

export function useSessionActivity() {
  const touch = useBiometricStore((s) => s.touch);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") touch();
    });
    return () => sub.remove();
  }, [touch]);

  return { touch };
}

export function ActivityPressable({
  onPress,
  ...rest
}: PressableProps) {
  const touch = useBiometricStore((s) => s.touch);
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        touch();
        if (typeof onPress === "function") onPress(e);
      }}
    />
  );
}
