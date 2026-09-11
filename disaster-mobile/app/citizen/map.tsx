import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchHazards, fetchWards } from "@/lib/api";
import { colors } from "@/lib/theme";
import { COLOMBO_CENTER, PIN_COLORS, type HazardRow, type WardRow } from "@/lib/types";

type MapsModule = typeof import("react-native-maps");

let maps: MapsModule | null = null;
if (Platform.OS !== "web") {
  maps = require("react-native-maps") as MapsModule;
}

export default function PublicMapScreen() {
  const [hazards, setHazards] = useState<HazardRow[]>([]);
  const [wards, setWards] = useState<WardRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchHazards(), fetchWards()]).then(([nextHazards, nextWards]) => {
        setHazards(nextHazards);
        setWards(nextWards);
      });
    }, []),
  );

  const criticalWard = wards.find((ward) => ward.status === "CRITICAL");
  const MapView = maps?.default;
  const Marker = maps?.Marker;
  const provider = maps?.PROVIDER_GOOGLE;

  return (
    <View style={styles.screen}>
      {criticalWard ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>AREA ALERT · {criticalWard.name}</Text>
          <Text style={styles.alertBody}>
            Rain {criticalWard.rainfall_mm} mm · river {criticalWard.river_level_pct}%
          </Text>
        </View>
      ) : null}

      {MapView && Marker ? (
        <MapView
          style={styles.map}
          provider={provider}
          initialRegion={{
            ...COLOMBO_CENTER,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {hazards.map((hazard) => (
            <Marker
              key={hazard.id}
              coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
              pinColor={PIN_COLORS[hazard.status]}
              title={hazard.category}
              description={`${hazard.status} · ${hazard.description ?? ""}`}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.meta}>MapView is native-only. Use the device build.</Text>
        </View>
      )}

      <ScrollView style={styles.list}>
        {hazards.map((hazard) => (
          <View key={hazard.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: PIN_COLORS[hazard.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {hazard.category} · {hazard.status}
              </Text>
              <Text style={styles.meta}>{hazard.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  alert: { backgroundColor: colors.red, padding: 12 },
  alertTitle: { color: colors.text, fontWeight: "700" },
  alertBody: { color: colors.text, marginTop: 4 },
  map: { height: 280 },
  fallback: { height: 80, justifyContent: "center", padding: 12 },
  list: { flex: 1, padding: 12 },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  title: { color: colors.text, fontWeight: "700" },
  meta: { color: colors.muted },
});
