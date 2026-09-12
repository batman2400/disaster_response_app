import { Tabs } from "expo-router";
import { View } from "react-native";

import { SignOutLink } from "@/components/sign-out";
import { useRequireRole } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function CitizenLayout() {
  const { ready, session } = useRequireRole("CITIZEN");
  if (!ready || session?.role !== "CITIZEN") {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerLeft: () => <SignOutLink />,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="report" options={{ title: "Report hazard" }} />
      <Tabs.Screen name="map" options={{ title: "Public map" }} />
    </Tabs>
  );
}
