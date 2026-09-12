import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SignOutLink } from "@/components/sign-out";
import { AuthProvider } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="citizen" options={{ headerShown: false }} />
        <Stack.Screen
          name="crew/index"
          options={{ title: "Field crew", headerRight: () => <SignOutLink /> }}
        />
      </Stack>
    </AuthProvider>
  );
}
