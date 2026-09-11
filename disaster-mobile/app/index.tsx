import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useRole } from "@/context/RoleContext";
import { colors } from "@/lib/theme";
import { ROLES, type Role } from "@/lib/types";

export default function RolePickerScreen() {
  const router = useRouter();
  const { setRole } = useRole();

  function pick(role: Role, route: string) {
    setRole(role);
    router.push(route as never);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>COLOMBO FLOOD RESPONSE</Text>
      <Text style={styles.title}>Who is using the app?</Text>
      <Text style={styles.sub}>
        Demo role picker — no login. Switch roles from here any time.
      </Text>
      {ROLES.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => pick(item.id, item.route)}
        >
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardHint}>{item.route}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 22,
    paddingTop: 72,
  },
  kicker: {
    color: colors.amber,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  sub: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  cardHint: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
  },
});
