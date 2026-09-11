import { Tabs } from "expo-router";

import { colors } from "@/lib/theme";

export default function CitizenLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="report" options={{ title: "Report" }} />
      <Tabs.Screen name="map" options={{ title: "Public map" }} />
    </Tabs>
  );
}
