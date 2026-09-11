import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { RoleProvider } from "@/context/RoleContext";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <RoleProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="citizen" options={{ headerShown: false }} />
        <Stack.Screen name="officer/index" options={{ title: "Officer desk" }} />
        <Stack.Screen name="crew/index" options={{ title: "Field crew" }} />
        <Stack.Screen name="relief/index" options={{ title: "Relief desk" }} />
      </Stack>
    </RoleProvider>
  );
}
