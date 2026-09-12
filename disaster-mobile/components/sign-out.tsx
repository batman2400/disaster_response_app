import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export function SignOutLink() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        signOut();
        router.replace("/");
      }}
      style={{ paddingHorizontal: 12 }}
    >
      <Text style={{ color: colors.amber, fontWeight: "700" }}>Log out</Text>
    </Pressable>
  );
}
