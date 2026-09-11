import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchHazards, fetchShelters } from "@/lib/api";
import { colors } from "@/lib/theme";
import { WARDS, type HazardRow, type ShelterRow } from "@/lib/types";

export default function ReliefScreen() {
  const [requests, setRequests] = useState<HazardRow[]>([]);
  const [shelters, setShelters] = useState<ShelterRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchHazards(), fetchShelters()]).then(([hazards, nextShelters]) => {
        setRequests(
          hazards.filter(
            (row) => row.category === "HELP_REQUEST" && row.status !== "RESOLVED",
          ),
        );
        setShelters(nextShelters);
      });
    }, []),
  );

  const matches = useMemo(() => {
    return requests.map((request) => {
      const options = shelters
        .filter((shelter) => shelter.ward_id === request.ward_id)
        .map((shelter) => ({
          ...shelter,
          free: shelter.total_beds - shelter.occupied_beds,
        }))
        .sort((a, b) => b.free - a.free);
      return { request, options };
    });
  }, [requests, shelters]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Match help requests to shelters in the same ward. Sorted by free beds — no routing algorithm.
      </Text>
      {matches.map(({ request, options }) => (
        <View key={request.id} style={styles.card}>
          <Text style={styles.title}>{request.description}</Text>
          <Text style={styles.meta}>
            {request.ward_id} · {WARDS.find((ward) => ward.id === request.ward_id)?.name}
          </Text>
          {options.map((shelter) => (
            <Text key={shelter.id} style={styles.option}>
              {shelter.name} · {shelter.free} free / {shelter.total_beds} · {shelter.supplies_status}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  hint: { color: colors.muted, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  title: { color: colors.text, fontWeight: "700", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, marginBottom: 8 },
  option: { color: colors.text, marginTop: 4 },
});
