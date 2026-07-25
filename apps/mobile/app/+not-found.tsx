import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

export default function NotFoundScreen() {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.wrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Screen not found
        </Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Go home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
});
