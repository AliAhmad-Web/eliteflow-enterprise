import { Stack } from "expo-router";
import { useTheme } from "@/theme/theme.store";

export default function CalendarLayout() {
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
