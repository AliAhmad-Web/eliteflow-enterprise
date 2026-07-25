import { memo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { useTheme } from "@/theme/theme.store";

interface SwipeableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
}

export const SwipeableRow = memo(function SwipeableRow({
  children,
  onEdit,
  onDelete,
  onComplete,
}: SwipeableRowProps) {
  const theme = useTheme();
  const { colors } = theme;

  const renderRight = () => (
    <View style={styles.actions}>
      {onEdit ? (
        <RectButton
          style={[styles.action, { backgroundColor: colors.info }]}
          onPress={onEdit}
        >
          <Text style={styles.actionText}>Edit</Text>
        </RectButton>
      ) : null}
      {onDelete ? (
        <RectButton
          style={[styles.action, { backgroundColor: colors.destructive }]}
          onPress={onDelete}
        >
          <Text style={styles.actionText}>Delete</Text>
        </RectButton>
      ) : null}
    </View>
  );

  const renderLeft = () =>
    onComplete ? (
      <RectButton
        style={[styles.action, styles.left, { backgroundColor: colors.success }]}
        onPress={onComplete}
      >
        <Text style={styles.actionText}>Done</Text>
      </RectButton>
    ) : null;

  if (!onEdit && !onDelete && !onComplete) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      friction={2}
      overshootFriction={8}
      renderRightActions={onEdit || onDelete ? renderRight : undefined}
      renderLeftActions={onComplete ? renderLeft : undefined}
    >
      {children}
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
  },
  action: {
    width: 76,
    justifyContent: "center",
    alignItems: "center",
  },
  left: {
    width: 84,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
