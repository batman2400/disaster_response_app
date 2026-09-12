import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Card,
  EmptyState,
  Kicker,
  PrimaryButton,
  Screen,
  Stat,
  StatusBadge,
  Sub,
  Title,
  UrgencyBadge,
} from "@/components/ui";
import { fetchHazards, postResolve } from "@/lib/api";
import { useRequireRole } from "@/lib/auth-context";
import { categoryLabel, timeAgo, wardName } from "@/lib/format";
import { mapHazardRow, sortHazards, useLiveRows } from "@/lib/live";
import { colors, urgencyColor } from "@/lib/theme";
import { type HazardRow } from "@/lib/types";

export default function CrewScreen() {
  const { ready, session } = useRequireRole("FIELD_CREW");
  const { rows: hazards } = useLiveRows<HazardRow>({
    table: "hazards",
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: fetchHazards,
  });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const tickets = useMemo(
    () => hazards.filter((row) => row.status !== "RESOLVED"),
    [hazards],
  );

  const sorted = useMemo(() => {
    const rank = { CRITICAL: 0, MEDIUM: 1, LOW: 2 };
    return [...tickets].sort((a, b) => rank[a.urgency] - rank[b.urgency]);
  }, [tickets]);

  const blocked = tickets.filter((ticket) => ticket.is_road_blocked).length;
  const critical = tickets.filter((ticket) => ticket.urgency === "CRITICAL").length;

  async function closeTicket(incident_id: string) {
    setError("");
    setBusyId(incident_id);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to close a ticket.");
        return;
      }
      const photo = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
      if (photo.canceled || !photo.assets[0].base64) return;
      await postResolve({
        incident_id,
        closure_photo_base64: `data:image/jpeg;base64,${photo.assets[0].base64}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready || session?.role !== "FIELD_CREW") {
    return null;
  }

  return (
    <Screen>
      <Kicker>FIELD CREW</Kicker>
      <Title>Resolution queue</Title>
      <Sub>
        {session.name} · Closing a ticket requires a new after-fix photo. The public map pin flips
        to RESOLVED.
      </Sub>

      <View style={styles.stats}>
        <Stat label="Open jobs" value={tickets.length} color={colors.blue} />
        <Stat label="Roads blocked" value={blocked} color={colors.red} />
        <Stat label="Critical" value={critical} color={urgencyColor.CRITICAL} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {sorted.length === 0 ? (
        <EmptyState title="No open tickets" body="Resolved hazards drop off this list." />
      ) : (
        sorted.map((ticket) => (
          <Card key={ticket.id} accent={urgencyColor[ticket.urgency]}>
            <View style={styles.badges}>
              <StatusBadge status={ticket.status} />
              <UrgencyBadge urgency={ticket.urgency} />
              {ticket.is_road_blocked ? <Badge label="ROAD BLOCKED" color={colors.red} /> : null}
            </View>
            <Text style={styles.cardTitle}>{categoryLabel(ticket.category)}</Text>
            <Text style={styles.body}>{ticket.description}</Text>
            <Text style={styles.meta}>
              {wardName(ticket.ward_id)} · {ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)} · {timeAgo(ticket.created_at)}
            </Text>
            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                label="Close with after-fix photo"
                color={colors.green}
                textColor={colors.ink}
                loading={busyId === ticket.id}
                onPress={() => void closeTicket(ticket.id)}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, marginBottom: 14 },
  error: { color: colors.red, marginBottom: 12, fontWeight: "600" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, rowGap: 6, marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 18 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20 },
  meta: { color: colors.muted, marginTop: 6, fontSize: 12 },
});
