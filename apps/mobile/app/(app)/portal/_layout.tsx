import { Stack } from "expo-router";

import { useTheme } from "@/theme/theme.store";

export default function PortalLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
