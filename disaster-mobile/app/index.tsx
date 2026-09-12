import { useRouter } from "expo-router";
import { createElement } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { ROLES, type Role } from "@/lib/types";

const logoSource = require("../assets/images/logo.png") as number | string | { uri?: string };

const ROLE_COPY: Record<Role, { hint: string; accent: string }> = {
  CITIZEN: { hint: "Report a hazard and watch the public map", accent: colors.blue },
  FIELD_CREW: { hint: "Close a hazard with an after-fix photo", accent: colors.green },
};

function logoUri() {
  if (typeof logoSource === "string") return logoSource;
  if (typeof logoSource === "object" && logoSource.uri) return logoSource.uri;
  return undefined;
}

function BrandMark() {
  if (Platform.OS === "web") {
    return createElement("img", {
      src: logoUri(),
      alt: "Fender",
      style: { width: 92, height: 92, objectFit: "contain", display: "block" },
    });
  }
  return (
    <Image
      source={logoSource as number}
      style={styles.logo}
      resizeMode="contain"
      accessibilityLabel="Fender"
    />
  );
}

export default function RolePickerScreen() {
  const router = useRouter();

  function pick(route: string) {
    router.push(route as never);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.logoWrap}>
        <BrandMark />
      </View>
      <Text style={styles.kicker}>FIELD APP</Text>
      <Text style={styles.title}>Fender</Text>
      <Text style={styles.sub}>Report a hazard or close one on site. Desk work lives on the web.</Text>

      {ROLES.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.card, { borderLeftColor: ROLE_COPY[item.id].accent }]}
          onPress={() => pick(item.route)}
        >
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardHint}>{ROLE_COPY[item.id].hint}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 72, paddingBottom: 48 },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    overflow: "hidden",
  },
  logo: { width: 92, height: 92 },
  kicker: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 8,
  },
  sub: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 16,
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
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
});
