import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchHazards, postOverride } from "@/lib/api";
import { colors } from "@/lib/theme";
import { PIN_COLORS, type HazardRow, type HazardStatus } from "@/lib/types";

export default function OfficerScreen() {
  const [tickets, setTickets] = useState<HazardRow[]>([]);
  const [note, setNote] = useState("override from officer desk");

  async function load() {
    setTickets(await fetchHazards());
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function override(incident_id: string, new_status: HazardStatus) {
    await postOverride({ incident_id, new_status, officer_note: note });
    setNote(`override ${new_status}`);
    await load();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Override writes to POST /api/override and nudges ai_settings on the backend.
      </Text>
      {tickets.map((ticket) => (
        <View key={ticket.id} style={styles.card}>
          <View style={[styles.badge, { backgroundColor: PIN_COLORS[ticket.status] }]}>
            <Text style={styles.badgeText}>{ticket.status}</Text>
          </View>
          <Text style={styles.title}>
            {ticket.category} · {ticket.urgency}
          </Text>
          <Text style={styles.meta}>{ticket.description}</Text>
          <Text style={styles.meta}>score {ticket.confidence_score}</Text>
          <View style={styles.row}>
            <Pressable style={styles.button} onPress={() => override(ticket.id, "PUBLISHED")}>
              <Text style={styles.buttonText}>Confirm</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => override(ticket.id, "NEED_INFO")}>
              <Text style={styles.buttonText}>Need info</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: colors.muted, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: colors.text, fontWeight: "700", fontSize: 11 },
  title: { color: colors.text, fontWeight: "700", marginTop: 8, fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  button: {
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonText: { color: colors.text, fontWeight: "700" },
});
