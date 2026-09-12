import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Card,
  GhostButton,
  Kicker,
  StatusBadge,
  Sub,
  UrgencyBadge,
  WardBadge,
} from "@/components/ui";
import { fetchHazards, fetchWards, postConfirm } from "@/lib/api";
import { categoryLabel, timeAgo, wardName } from "@/lib/format";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/live";
import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors } from "@/lib/theme";
import { COLOMBO_CENTER, PIN_COLORS, type HazardRow, type WardId, type WardRow } from "@/lib/types";

type MapsModule = typeof import("react-native-maps");

let maps: MapsModule | null = null;
if (Platform.OS !== "web") {
  maps = require("react-native-maps") as MapsModule;
}

export default function PublicMapScreen() {
  const { rows: hazards } = useLiveRows<HazardRow>({
    table: "hazards",
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: fetchHazards,
  });
  const { rows: wards, live } = useLiveRows<WardRow>({
    table: "wards",
    mapRow: mapWardRow,
    sort: sortWards,
    fallbackFetch: fetchWards,
  });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState("");

  const needsConfirmation = useMemo(
    () => hazards.filter((hazard) => hazard.status === "NEED_INFO" || hazard.status === "PENDING"),
    [hazards],
  );

  // Trim-tier: static safe-route polylines, shown only while a ward is
  // genuinely in trouble (CRITICAL telemetry or a confirmed area alert).
  const activeSafeRouteWards = useMemo(() => {
    const wardIds = new Set<WardId>();
    for (const ward of wards) {
      if (ward.status === "CRITICAL") wardIds.add(ward.id);
    }
    for (const hazard of hazards) {
      if (hazard.status === "AREA_ALERT") wardIds.add(hazard.ward_id);
    }
    return Array.from(wardIds).filter((id) => SAFE_ROUTES[id]);
  }, [wards, hazards]);

  async function confirmNearby(incident_id: string) {
    setConfirmingId(incident_id);
    setConfirmError("");
    try {
      await postConfirm({ incident_id });
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirmingId(null);
    }
  }

  const criticalWard = wards.find((ward) => ward.status === "CRITICAL");
  const alertHazard = hazards.find((hazard) => hazard.status === "AREA_ALERT");
  const MapView = maps?.default;
  const Marker = maps?.Marker;
  const Polyline = maps?.Polyline;
  const provider = maps?.PROVIDER_GOOGLE;

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
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
            {Polyline
              ? activeSafeRouteWards.map((wardId) => (
                  <Polyline
                    key={`route-${wardId}`}
                    coordinates={SAFE_ROUTES[wardId]}
                    strokeColor={colors.green}
                    strokeWidth={3}
                    lineDashPattern={[8, 6]}
                  />
                ))
              : null}
          </MapView>
        ) : (
          <View style={styles.fallback}>
            <Kicker>MAP TILES</Kicker>
            <Text style={styles.fallbackTitle}>Native MapView on device</Text>
            <Sub>Expo web shows the live pin list below. Android tiles need the EAS build.</Sub>
          </View>
        )}
      </View>

      <View style={styles.overlayContainer} pointerEvents="box-none">
        {criticalWard || alertHazard ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>
              AREA ALERT · {criticalWard?.name ?? categoryLabel(alertHazard!.category)}
            </Text>
            <Text style={styles.alertBody}>
              {criticalWard
                ? `Rain ${criticalWard.rainfall_mm} mm · river ${criticalWard.river_level_pct}%`
                : alertHazard?.description}
            </Text>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.wardScroll}
          contentContainerStyle={styles.wardRow}
        >
          {wards.map((ward) => (
            <View key={ward.id} style={styles.wardChip}>
              <WardBadge status={ward.status} />
              <Text style={styles.wardName} numberOfLines={1}>
                {ward.name.split(" / ")[0]}
              </Text>
              <Text style={styles.wardMeta}>
                {ward.rainfall_mm} mm · {ward.river_level_pct}%
              </Text>
            </View>
          ))}
        </ScrollView>

        {needsConfirmation.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.confirmScroll}
            contentContainerStyle={styles.confirmRow}
          >
            {needsConfirmation.map((hazard) => (
              <View key={hazard.id} style={styles.confirmCard}>
                <View style={styles.badgeRow}>
                  <StatusBadge status={hazard.status} />
                  <Badge label={`${hazard.confirmations_count} confirmed`} color={colors.blue} />
                </View>
                <Text style={styles.confirmTitle} numberOfLines={1}>
                  {categoryLabel(hazard.category)}
                </Text>
                <Text style={styles.confirmMeta} numberOfLines={1}>
                  {wardName(hazard.ward_id)} · {timeAgo(hazard.created_at)}
                </Text>
                <GhostButton
                  label={confirmingId === hazard.id ? "Confirming…" : "I see this too"}
                  disabled={confirmingId === hazard.id}
                  onPress={() => void confirmNearby(hazard.id)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
        {confirmError ? <Text style={styles.confirmError}>{confirmError}</Text> : null}
      </View>

      <View style={styles.bottomSheet}>
        {activeSafeRouteWards.length > 0 ? (
          <Text style={styles.routeLegend}>
            ┅ Dashed line marks a static safe route toward the nearest shelter — not computed.
          </Text>
        ) : null}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <Text style={styles.listTitle}>
            {hazards.length} live pins{live ? "" : " · polling"}
          </Text>
          {hazards.map((hazard) => (
            <Card key={hazard.id} accent={PIN_COLORS[hazard.status]} style={styles.item}>
              <View style={styles.badgeRow}>
                <StatusBadge status={hazard.status} />
                <UrgencyBadge urgency={hazard.urgency} />
                {hazard.is_road_blocked ? <Badge label="ROAD BLOCKED" color={colors.red} /> : null}
              </View>
              <Text style={styles.itemTitle}>{categoryLabel(hazard.category)}</Text>
              <Text style={styles.itemBody}>{hazard.description}</Text>
              <Text style={styles.itemMeta}>
                {wardName(hazard.ward_id)} · {timeAgo(hazard.created_at)}
              </Text>
            </Card>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  alert: { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 12 },
  alertTitle: { color: colors.text, fontWeight: "700" },
  alertBody: { color: colors.text, marginTop: 4 },
  wardScroll: { flexGrow: 0, maxHeight: 102 },
  wardRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: "flex-start" },
  wardChip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    width: 168,
  },
  wardName: { color: colors.text, fontWeight: "700", marginTop: 8 },
  wardMeta: { color: colors.muted, marginTop: 2, fontSize: 12 },
  confirmScroll: { flexGrow: 0, maxHeight: 148 },
  confirmRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: "flex-start" },
  confirmCard: {
    backgroundColor: colors.card,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    width: 200,
  },
  confirmTitle: { color: colors.text, fontWeight: "700", marginTop: 8 },
  confirmMeta: { color: colors.muted, marginTop: 2, marginBottom: 8, fontSize: 12 },
  confirmError: { color: colors.red, marginHorizontal: 16, marginBottom: 8, fontWeight: "600" },
  fallback: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 220,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignSelf: "stretch",
    maxHeight: 140,
  },
  fallbackTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "38%",
    zIndex: 10,
    backgroundColor: colors.bg,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  routeLegend: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  listTitle: {
    color: colors.muted,
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 12,
  },
  item: { marginBottom: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  itemTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  itemBody: { color: colors.text, marginTop: 4 },
  itemMeta: { color: colors.muted, marginTop: 6, fontSize: 12 },
});
