import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HazardMap } from "@/components/HazardMap";
import {
  Badge,
  Card,
  GhostButton,
  StatusBadge,
  UrgencyBadge,
  WardBadge,
} from "@/components/ui";
import { fetchHazards, fetchWards, postConfirm } from "@/lib/api";
import { categoryLabel, timeAgo, wardName } from "@/lib/format";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/live";
import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors } from "@/lib/theme";
import { PIN_COLORS, type HazardRow, type WardId, type WardRow } from "@/lib/types";

export default function PublicMapScreen() {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
        <HazardMap hazards={hazards} routeWards={activeSafeRouteWards} />
      </View>

      <View style={[styles.overlayContainer, { paddingTop: insets.top > 0 ? insets.top : 8 }]} pointerEvents="box-none">
        {criticalWard || alertHazard ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>
              ⚠ AREA ALERT · {criticalWard?.name ?? categoryLabel(alertHazard!.category)}
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

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 60 }]}>
        <View style={styles.handle} />

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
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  alert: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  alertTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  alertBody: { color: "#FFFFFF", marginTop: 4, fontSize: 13, opacity: 0.9 },
  wardScroll: { flexGrow: 0, maxHeight: 102 },
  wardRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "flex-start" },
  wardChip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    width: 168,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  wardName: { color: colors.text, fontWeight: "700", marginTop: 8, fontSize: 14 },
  wardMeta: { color: colors.muted, marginTop: 2, fontSize: 12 },
  confirmScroll: { flexGrow: 0, maxHeight: 148 },
  confirmRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "flex-start" },
  confirmCard: {
    backgroundColor: colors.card,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmTitle: { color: colors.text, fontWeight: "700", marginTop: 8 },
  confirmMeta: { color: colors.muted, marginTop: 2, marginBottom: 8, fontSize: 12 },
  confirmError: { color: colors.red, marginHorizontal: 16, marginBottom: 8, fontWeight: "600" },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "45%",
    zIndex: 10,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  routeLegend: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 16 },
  listTitle: {
    color: colors.muted,
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  item: { marginBottom: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, rowGap: 6, marginBottom: 8 },
  itemTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  itemBody: { color: colors.text, marginTop: 4, fontSize: 14 },
  itemMeta: { color: colors.muted, marginTop: 6, fontSize: 12 },
});
