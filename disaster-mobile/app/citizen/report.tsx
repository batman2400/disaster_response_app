import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Badge,
  Card,
  CheckRow,
  GhostButton,
  Kicker,
  PrimaryButton,
  Screen,
  StatusBadge,
  Sub,
  Title,
  UrgencyBadge,
} from "@/components/ui";
import { postReport } from "@/lib/api";
import { categoryLabel, scorePct, wardName } from "@/lib/format";
import { colors, urgencyColor } from "@/lib/theme";
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

  const hasCoordinates = Boolean(lat && lng);
  const canSubmit = hasCoordinates && Boolean(photo);

  async function grabGps() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      if (!hasCoordinates) {
        setError("Location permission is required.");
      }
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(Number(pos.coords.latitude.toFixed(5)));
    setLng(Number(pos.coords.longitude.toFixed(5)));
    setError("");
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
    <Screen>
      <Kicker>CITIZEN REPORT</Kicker>
      <Title>Tag a hazard</Title>
      <Sub>Take a photo, pin your location, and send the report. You get a status and reason back.</Sub>

      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setCategory(item.id)}
            style={[styles.chip, category === item.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, category === item.id && styles.chipTextOn]}>
              {item.label}
            </Text>
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
          <Text style={styles.optionId}>{item.id}</Text>
          <Text style={styles.optionText}>{item.name}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>What is happening?</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Waist-deep water near the bridge…"
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
      />

      <Card style={styles.tight}>
        <Text style={styles.cardTitle}>GPS lock</Text>
        <Text style={styles.coords}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>
        <Text style={styles.meta}>{wardName(wardId)}</Text>
        <View style={styles.actions}>
          <GhostButton label="Use GPS" onPress={() => void grabGps()} />
        </View>
      </Card>

      <Card style={styles.tight}>
        <Text style={styles.cardTitle}>Evidence photo</Text>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.preview} />
        ) : (
          <View style={styles.photoSlot}>
            <Text style={styles.meta}>Required for a strong image check</Text>
          </View>
        )}
        <View style={styles.actions}>
          <GhostButton
            label={photo ? "Retake photo" : "Take photo"}
            onPress={() => void takePhoto()}
          />
        </View>
      </Card>

      <PrimaryButton
        label="Submit report"
        onPress={() => void submit()}
        disabled={!canSubmit}
        loading={busy}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {verdict ? <VerdictCard verdict={verdict} category={category} /> : null}
    </Screen>
  );
}

function VerdictCard({
  verdict,
  category,
}: {
  verdict: ReportResponse;
  category: HazardCategory;
}) {
  return (
    <Card accent={urgencyColor[verdict.urgency]} style={{ marginTop: 16 }}>
      <Kicker color={urgencyColor[verdict.urgency]}>PIPELINE VERDICT</Kicker>
      <View style={styles.badgeRow}>
        <StatusBadge status={verdict.status} />
        <UrgencyBadge urgency={verdict.urgency} />
        <Badge label={scorePct(verdict.confidence_score)} color={colors.blue} />
      </View>
      <Text style={styles.verdictTitle}>{categoryLabel(category)}</Text>
      <Text style={styles.meta}>id {verdict.incident_id}</Text>
      <Text style={styles.reason}>{verdict.reasoning}</Text>
      <Text style={styles.meta}>
        Road blocked {verdict.is_road_blocked ? "yes" : "no"}
      </Text>
      <View style={{ marginTop: 8 }}>
        <CheckRow
          label="Image verified"
          ok={verdict.checks.image_verified}
          detail="Photo accepted by the vision check"
        />
        <CheckRow
          label="Weather supported"
          ok={verdict.checks.weather_supported}
          detail="Ward rainfall > 40 mm or river > 75%"
        />
        <CheckRow
          label="Cluster"
          ok={verdict.checks.cluster_count >= 2}
          detail={`${verdict.checks.cluster_count} nearby reports`}
        />
        <CheckRow
          label="Location matched"
          ok={verdict.checks.location_matched}
          detail="GPS sits inside the expected Colombo envelope"
        />
        <CheckRow
          label="Risk level"
          ok={verdict.checks.risk_level !== "LOW"}
          detail={verdict.checks.risk_level}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.amber,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
    fontSize: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.amber, backgroundColor: colors.cardSoft },
  chipText: { color: colors.muted, fontWeight: "700" },
  chipTextOn: { color: colors.text },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  optionOn: { borderColor: colors.amber },
  optionId: { color: colors.amber, fontWeight: "700", fontSize: 12 },
  optionText: { color: colors.text, marginTop: 2 },
  input: {
    minHeight: 88,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: colors.card,
  },
  tight: { marginTop: 12, marginBottom: 0 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  coords: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 6 },
  meta: { color: colors.muted, marginTop: 6 },
  actions: { marginTop: 12 },
  preview: { height: 160, borderRadius: 12, marginTop: 10 },
  photoSlot: {
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg2,
  },
  error: { color: colors.red, marginTop: 12, fontWeight: "600" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  verdictTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  reason: { color: colors.text, marginTop: 10, lineHeight: 21 },
});
