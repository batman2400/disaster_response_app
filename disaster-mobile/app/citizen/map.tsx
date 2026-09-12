import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HazardMap } from "@/components/HazardMap";
import {
  Badge,
  GhostButton,
  HazardBadgeRow,
  HazardSummaryCard,
} from "@/components/ui";
import { fetchHazards, fetchWards, postConfirm } from "@/lib/api";
import { categoryLabel, timeAgo, wardName } from "@/lib/format";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/live";
import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors, wardStatusColor } from "@/lib/theme";
import {
  COLOMBO_CENTER,
  PIN_COLORS,
  type HazardRow,
  type WardId,
  type WardRow,
} from "@/lib/types";

const WARD_HOTSPOTS: Record<WardId, { latitude: number; longitude: number }> = {
  ward_01: { latitude: 6.9535, longitude: 79.8732 },
  ward_02: { latitude: 6.9271, longitude: 79.8612 },
  ward_03: { latitude: 6.9355, longitude: 79.85 },
};

type FilterMode = "ALL" | "NEED_INFO" | "BLOCKED";

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
  const [selectedHazard, setSelectedHazard] = useState<HazardRow | null>(null);
  const [focusCoords, setFocusCoords] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Trim-tier: static safe-route polylines shown during critical alert
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

  const filteredHazards = useMemo(() => {
    if (filterMode === "NEED_INFO") {
      return hazards.filter((h) => h.status === "NEED_INFO" || h.status === "PENDING");
    }
    if (filterMode === "BLOCKED") {
      return hazards.filter((h) => h.is_road_blocked);
    }
    return hazards;
  }, [hazards, filterMode]);

  async function confirmNearby(incident_id: string) {
    setConfirmingId(incident_id);
    setConfirmError("");
    try {
      await postConfirm({ incident_id });
      // update local selection state count optimistically
      if (selectedHazard?.id === incident_id) {
        setSelectedHazard((prev) =>
          prev ? { ...prev, confirmations_count: prev.confirmations_count + 1 } : null,
        );
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirmingId(null);
    }
  }

  function handleSelectHazard(hazard: HazardRow | null) {
    setSelectedHazard(hazard);
    if (hazard) {
      setFocusCoords({ latitude: hazard.lat, longitude: hazard.lng, zoom: 15 });
    }
  }

  function handleRecenterColombo() {
    setSelectedHazard(null);
    setFocusCoords({
      latitude: COLOMBO_CENTER.latitude,
      longitude: COLOMBO_CENTER.longitude,
      zoom: 12,
    });
  }

  function handleFocusWard(wardId: WardId) {
    const coords = WARD_HOTSPOTS[wardId];
    if (coords) {
      setFocusCoords({ latitude: coords.latitude, longitude: coords.longitude, zoom: 14 });
    }
  }

  const criticalWard = wards.find((ward) => ward.status === "CRITICAL");
  const alertHazard = hazards.find((hazard) => hazard.status === "AREA_ALERT");

  return (
    <View style={styles.screen}>
      {/* 1. Full-screen Interactive Map */}
      <View style={styles.mapContainer}>
        <HazardMap
          hazards={hazards}
          routeWards={activeSafeRouteWards}
          selectedHazardId={selectedHazard?.id}
          onSelectHazard={handleSelectHazard}
          focusCoords={focusCoords}
        />
      </View>

      {/* 2. Compact Top Overlay */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        {/* Critical Alert Banner */}
        {(criticalWard || alertHazard) && !alertDismissed ? (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle} numberOfLines={1}>
                AREA ALERT · {criticalWard?.name.split(" / ")[0] ?? categoryLabel(alertHazard!.category)}
              </Text>
              <Text style={styles.alertBody} numberOfLines={1}>
                {criticalWard
                  ? `Rain ${criticalWard.rainfall_mm} mm · River ${criticalWard.river_level_pct}%`
                  : alertHazard?.description}
              </Text>
            </View>
            <Pressable
              onPress={() => setAlertDismissed(true)}
              hitSlop={8}
              style={styles.alertDismissBtn}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* Compact Horizontal Ward Telemetry Chips — hidden while a pin or the list is focused, to keep only one overlay in view at a time */}
        {!selectedHazard && !isSheetExpanded ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.wardScroll}
            contentContainerStyle={styles.wardRow}
          >
            {wards.map((ward) => {
              const statusDotColor = wardStatusColor[ward.status];
              return (
                <Pressable
                  key={ward.id}
                  style={styles.wardChip}
                  onPress={() => handleFocusWard(ward.id)}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                  <Text style={styles.wardChipText} numberOfLines={1}>
                    {ward.name.split(" / ")[0]}
                  </Text>
                  <Text style={styles.wardChipData}>
                    {ward.rainfall_mm}mm
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* 3. Floating Map Controls — hidden while the pin preview card occupies the same space */}
      {!selectedHazard ? (
        <View
          style={[styles.controlsContainer, { bottom: isSheetExpanded ? "53%" : 76 }]}
          pointerEvents="box-none"
        >
          {activeSafeRouteWards.length > 0 ? (
            <View style={styles.routePill}>
              <View style={styles.routeDash} />
              <Text style={styles.routeText}>Evacuation route active</Text>
            </View>
          ) : <View />}

          <Pressable
            style={styles.recenterBtn}
            onPress={handleRecenterColombo}
            accessibilityLabel="Recenter map"
          >
            <Ionicons name="locate" size={20} color={colors.blue} />
          </Pressable>
        </View>
      ) : null}

      {/* 4. Selected Pin Details Card (Popup above peek sheet) */}
      {selectedHazard && !isSheetExpanded ? (
        <View style={styles.pinPreviewCard}>
          <View style={styles.pinPreviewHeader}>
            <HazardBadgeRow hazard={selectedHazard} />
            <Pressable
              onPress={() => setSelectedHazard(null)}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={styles.pinPreviewTitle}>{categoryLabel(selectedHazard.category)}</Text>
          <Text style={styles.pinPreviewBody} numberOfLines={2}>
            {selectedHazard.description || "No additional description provided."}
          </Text>

          <View style={styles.pinPreviewFooter}>
            <Text style={styles.pinPreviewMeta}>
              {wardName(selectedHazard.ward_id)} · {timeAgo(selectedHazard.created_at)}
            </Text>
            {selectedHazard.status === "NEED_INFO" || selectedHazard.status === "PENDING" ? (
              <GhostButton
                label={confirmingId === selectedHazard.id ? "Confirming…" : `Confirm (${selectedHazard.confirmations_count})`}
                disabled={confirmingId === selectedHazard.id}
                onPress={() => void confirmNearby(selectedHazard.id)}
              />
            ) : (
              <Badge label={`${selectedHazard.confirmations_count} confirmed`} color={colors.blue} />
            )}
          </View>
          {confirmError ? <Text style={styles.confirmError}>{confirmError}</Text> : null}
        </View>
      ) : null}

      {/* 5. Collapsible Bottom Sheet */}
      <View
        style={[
          styles.bottomSheet,
          isSheetExpanded ? styles.bottomSheetExpanded : styles.bottomSheetPeek,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {/* Drag Handle / Toggle Header */}
        <Pressable
          style={styles.sheetHeader}
          onPress={() => setIsSheetExpanded((prev) => !prev)}
        >
          <View style={styles.handle} />
          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetTitleLeft}>
              <Text style={styles.sheetTitle}>
                {hazards.length === 0 ? "Loading…" : `${hazards.length} Live Pins`}
              </Text>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: live ? colors.green : colors.amber }]} />
                <Text style={styles.liveText}>{live ? "Realtime" : "Polling"}</Text>
              </View>
            </View>

            <View style={styles.toggleBtn}>
              <Text style={styles.toggleText}>
                {isSheetExpanded ? "Hide list" : "View list"}
              </Text>
              <Ionicons
                name={isSheetExpanded ? "chevron-down" : "chevron-up"}
                size={16}
                color={colors.blue}
              />
            </View>
          </View>
        </Pressable>

        {/* Expanded View Content */}
        {isSheetExpanded ? (
          <View style={styles.expandedContent}>
            {/* Filter Chips */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, filterMode === "ALL" && styles.filterChipActive]}
                onPress={() => setFilterMode("ALL")}
              >
                <Text style={[styles.filterChipText, filterMode === "ALL" && styles.filterChipTextActive]}>
                  All ({hazards.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, filterMode === "NEED_INFO" && styles.filterChipActive]}
                onPress={() => setFilterMode("NEED_INFO")}
              >
                <Text style={[styles.filterChipText, filterMode === "NEED_INFO" && styles.filterChipTextActive]}>
                  Needs Verification ({hazards.filter((h) => h.status === "NEED_INFO" || h.status === "PENDING").length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, filterMode === "BLOCKED" && styles.filterChipActive]}
                onPress={() => setFilterMode("BLOCKED")}
              >
                <Text style={[styles.filterChipText, filterMode === "BLOCKED" && styles.filterChipTextActive]}>
                  Roads Blocked ({hazards.filter((h) => h.is_road_blocked).length})
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.hazardList}
              contentContainerStyle={styles.hazardListContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredHazards.length === 0 ? (
                <Text style={styles.emptyText}>No hazards in this category.</Text>
              ) : (
                filteredHazards.map((hazard) => (
                  <HazardSummaryCard
                    key={hazard.id}
                    hazard={hazard}
                    focused={selectedHazard?.id === hazard.id}
                    onPress={() => {
                      handleSelectHazard(hazard);
                      setIsSheetExpanded(false);
                    }}
                  >
                    <Text style={styles.tapToView}>Tap to locate →</Text>
                  </HazardSummaryCard>
                ))
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // Top Overlay
  topOverlay: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  alertBanner: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  alertTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  alertBody: { color: "#FFFFFF", fontSize: 12, opacity: 0.95 },
  alertDismissBtn: { padding: 4 },

  wardScroll: { flexGrow: 0 },
  wardRow: { gap: 6, alignItems: "center", paddingVertical: 2 },
  wardChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  wardChipText: { color: colors.text, fontWeight: "600", fontSize: 12 },
  wardChipData: { color: colors.muted, fontSize: 11 },

  // Floating Controls
  controlsContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderColor: colors.line,
    borderWidth: 1,
    gap: 6,
  },
  routeDash: {
    width: 14,
    height: 3,
    backgroundColor: colors.green,
    borderRadius: 1.5,
  },
  routeText: { color: colors.green, fontSize: 11, fontWeight: "700" },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },

  // Pin Preview Card
  pinPreviewCard: {
    position: "absolute",
    bottom: 74,
    left: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  pinPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  closeBtn: { padding: 4 },
  pinPreviewTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  pinPreviewBody: { color: colors.text, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  pinPreviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pinPreviewMeta: { color: colors.muted, fontSize: 12 },
  confirmError: { color: colors.red, marginTop: 6, fontSize: 12, fontWeight: "600" },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheetPeek: {
    height: 64,
  },
  bottomSheetExpanded: {
    maxHeight: "52%",
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  toggleText: { color: colors.blue, fontWeight: "600", fontSize: 12 },

  // Expanded Content
  expandedContent: { flex: 1, minHeight: 240 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.bg2,
  },
  filterChipActive: {
    backgroundColor: colors.blue,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  hazardList: { flex: 1 },
  hazardListContent: { padding: 16, paddingBottom: 24 },
  tapToView: { color: colors.blue, fontSize: 12, fontWeight: "600", marginTop: 8, textAlign: "right" },
  emptyText: { textAlign: "center", color: colors.muted, marginVertical: 32, fontSize: 13 },
});
