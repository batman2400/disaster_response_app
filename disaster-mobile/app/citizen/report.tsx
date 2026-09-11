import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_URL, postReport } from "@/lib/api";
import { colors } from "@/lib/theme";
import {
  CATEGORIES,
  WARDS,
  type HazardCategory,
  type ReportResponse,
  type WardId,
} from "@/lib/types";

export default function ReportScreen() {
  const [category, setCategory] = useState<HazardCategory>("FLOOD");
  const [wardId, setWardId] = useState<WardId>("ward_01");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState("");
  const [lat, setLat] = useState(6.9535);
  const [lng, setLng] = useState(79.8732);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<ReportResponse | null>(null);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
  }

  async function grabGps() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError("Location permission is required.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(Number(pos.coords.latitude.toFixed(5)));
    setLng(Number(pos.coords.longitude.toFixed(5)));
  }

  async function submit() {
    setBusy(true);
    setError("");
    setVerdict(null);
    try {
      const result = await postReport({
        lat,
        lng,
        ward_id: wardId,
        category,
        photo_base64: photo,
        help_request: category === "HELP_REQUEST",
        description,
      });
      setVerdict(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        API: {API_URL || "not set — add EXPO_PUBLIC_API_URL"}
      </Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setCategory(item.id)}
            style={[styles.chip, category === item.id && styles.chipOn]}
          >
            <Text style={styles.chipText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Ward</Text>
      {WARDS.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => setWardId(item.id)}
          style={[styles.option, wardId === item.id && styles.optionOn]}
        >
          <Text style={styles.optionText}>
            {item.id} · {item.name}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What is happening?"
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
      />

      <Text style={styles.meta}>
        GPS {lat}, {lng}
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={grabGps}>
          <Text style={styles.buttonText}>Use GPS</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>{photo ? "Photo attached" : "Take photo"}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.submit} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.submitText}>Submit report</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {verdict ? (
        <View style={styles.verdict}>
          <Text style={styles.verdictTitle}>
            {verdict.status} · {verdict.urgency}
          </Text>
          <Text style={styles.meta}>id {verdict.incident_id}</Text>
          <Text style={styles.meta}>
            confidence {verdict.confidence_score} · blocked{" "}
            {String(verdict.is_road_blocked)}
          </Text>
          <Text style={styles.body}>{verdict.reasoning}</Text>
          <Text style={styles.meta}>
            image {String(verdict.checks.image_verified)} · weather{" "}
            {String(verdict.checks.weather_supported)} · cluster{" "}
            {verdict.checks.cluster_count} · location{" "}
            {String(verdict.checks.location_matched)} · risk{" "}
            {verdict.checks.risk_level}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: colors.muted, marginBottom: 16 },
  label: { color: colors.amber, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.amber },
  chipText: { color: colors.text, fontWeight: "600" },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  optionOn: { borderColor: colors.amber },
  optionText: { color: colors.text },
  input: {
    minHeight: 80,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: colors.card,
  },
  meta: { color: colors.muted, marginTop: 8 },
  button: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: { color: colors.text, fontWeight: "600" },
  submit: {
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  submitText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  error: { color: colors.red, marginTop: 12 },
  verdict: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  verdictTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  body: { color: colors.text, marginTop: 10, lineHeight: 20 },
});
