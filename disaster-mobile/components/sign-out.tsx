import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export function SignOutLink() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Switch role"
      onPress={() => {
        signOut();
        router.replace("/");
      }}
      style={styles.pill}
    >
      <Ionicons name="swap-horizontal-outline" size={15} color={colors.muted} />
      <Text style={styles.label}>Switch role</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 4,
  },
  label: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 13,
  },
});
