import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchHazards, postResolve } from "@/lib/api";
import { colors } from "@/lib/theme";
import { PIN_COLORS, type HazardRow } from "@/lib/types";

export default function CrewScreen() {
  const [tickets, setTickets] = useState<HazardRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const rows = await fetchHazards();
    setTickets(rows.filter((row) => row.status !== "RESOLVED"));
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function closeTicket(incident_id: string) {
    setError("");
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
    await load();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Closing a ticket requires an after-fix photo.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tickets.map((ticket) => (
        <View key={ticket.id} style={styles.card}>
          <Text style={[styles.badge, { color: PIN_COLORS[ticket.status] }]}>
            {ticket.status}
          </Text>
          <Text style={styles.title}>{ticket.category}</Text>
          <Text style={styles.meta}>{ticket.description}</Text>
          <Pressable style={styles.button} onPress={() => closeTicket(ticket.id)}>
            <Text style={styles.buttonText}>Close with photo</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  hint: { color: colors.muted, marginBottom: 12 },
  error: { color: colors.red, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  badge: { fontWeight: "700" },
  title: { color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 6 },
  meta: { color: colors.muted, marginTop: 4 },
  button: {
    marginTop: 12,
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: { color: colors.text, fontWeight: "700" },
});
