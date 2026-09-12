import { useRouter } from "expo-router";
import { Tabs } from "expo-router";
import { Pressable, Text } from "react-native";

import { colors } from "@/lib/theme";

function RolesLink() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.replace("/")} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: colors.amber, fontWeight: "700" }}>Home</Text>
    </Pressable>
  );
}

export default function CitizenLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerLeft: () => <RolesLink />,
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
