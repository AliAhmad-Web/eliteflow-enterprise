import { Stack } from "expo-router";

import { useTheme } from "@/theme/theme.store";

export default function ClientsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
