import { useRouter } from "expo-router";
import { createElement, useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Label, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { displayName, verifyCrewPassword } from "@/lib/session";
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
      style: { width: 72, height: 72, objectFit: "contain", display: "block" },
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

function homeFor(role: Role) {
  return ROLES.find((r) => r.id === role)?.route ?? "/citizen/report";
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, ready, signIn } = useAuth();
  const [role, setRole] = useState<Role>("CITIZEN");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    router.replace(homeFor(session.role) as never);
  }, [ready, router, session]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (role === "FIELD_CREW") {
        if (!password.trim()) {
          throw new Error("Crew password is required");
        }
        await verifyCrewPassword(password);
      }
      signIn({ role, name: displayName(name, role) });
      router.replace(homeFor(role) as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || session) {
    return <View style={styles.screen} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <BrandMark />
        </View>
        <Text style={styles.kicker}>FIELD APP</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.sub}>
          Citizens continue without a password. Field crew uses the shared site password.
        </Text>

        <View style={styles.card}>
          <Label>Role</Label>
          <View style={styles.roleRow}>
            {ROLES.map((item) => {
              const on = role === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setRole(item.id);
                    setError("");
                  }}
                  style={[
                    styles.roleChip,
                    on && styles.roleChipOn,
                    on && { borderColor: ROLE_COPY[item.id].accent },
                  ]}
                >
                  <Text style={[styles.roleTitle, on && styles.roleTitleOn]}>{item.label}</Text>
                  <Text style={styles.roleHint}>{ROLE_COPY[item.id].hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Label>Your name</Label>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={role === "FIELD_CREW" ? "Crew name" : "Optional"}
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            style={styles.input}
          />

          {role === "FIELD_CREW" ? (
            <>
              <Label>Password</Label>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Shared crew password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                style={styles.input}
              />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.action}>
            <PrimaryButton
              label={role === "FIELD_CREW" ? "Enter crew queue" : "Continue as citizen"}
              onPress={() => void submit()}
              loading={busy}
            />
          </View>
        </View>

        <Text style={styles.foot}>
          Officer and relief desks stay on the web dashboard. This app is for reports and field
          closures.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: 48 },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logo: { width: 72, height: 72 },
  kicker: {
    color: colors.blue,
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
    marginBottom: 22,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  roleRow: { gap: 10 },
  roleChip: {
    backgroundColor: colors.bg2,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  roleChipOn: {
    backgroundColor: colors.cardSoft,
  },
  roleTitle: { color: colors.muted, fontSize: 16, fontWeight: "700" },
  roleTitleOn: { color: colors.text },
  roleHint: { color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  input: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.bg2,
    fontSize: 16,
  },
  action: { marginTop: 18 },
  error: { color: colors.red, marginTop: 12, fontWeight: "600" },
  foot: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
  },
});
