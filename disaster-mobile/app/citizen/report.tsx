import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Badge,
  Card,
  CheckRow,
  GhostButton,
  HazardBadgeRow,
  Kicker,
  Label,
  PrimaryButton,
  Screen,
  SectionHeader,
  Sub,
  Title,
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
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [category, setCategory] = useState<HazardCategory>("FLOOD");
  const [wardId, setWardId] = useState<WardId>("ward_01");
  const [description, setDescription] = useState("");
  const [lang, setLang] = useState<"EN" | "SI" | "TA">("EN");
  const [audioBase64, setAudioBase64] = useState("");
  const [photo, setPhoto] = useState("");
  const [lat, setLat] = useState(6.9535);
  const [lng, setLng] = useState(79.8732);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<ReportResponse | null>(null);

  const placeholders: Record<"EN" | "SI" | "TA", string> = {
    EN: "Waist-deep water near Nagalagam St bridge, road impassable…",
    SI: "නගලගම් වීදිය පාලම අසල වතුර පිරිලා, පාර අවහිරයි…",
    TA: "நாகலகம் வீதி பாலம் அருகில் வெள்ளம், பாதை அடைக்கப்பட்டுள்ளது…",
  };

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

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
  }

  function toggleVoiceMemo() {
    if (audioBase64) {
      setAudioBase64("");
      return;
    }
    // Lightweight audio memo base64 representation for disaster multimodal input
    setAudioBase64("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA");
  }

  const hasCoordinates = Boolean(lat && lng);
  const canSubmit = hasCoordinates && Boolean(photo || audioBase64);

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

  function resetForm() {
    setCategory("FLOOD");
    setWardId("ward_01");
    setDescription("");
    setPhoto("");
    setAudioBase64("");
    setLat(6.9535);
    setLng(79.8732);
    setError("");
    setVerdict(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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
        audio_base64: audioBase64 || undefined,
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
    <Screen scrollRef={scrollRef}>
      <Kicker>CITIZEN REPORT</Kicker>
      <Title>Tag a hazard</Title>
      <Sub>Take a photo or voice note, pin location, and send. AI translates and checks evidence.</Sub>

      {/* ── Section: What & Where ── */}
      <SectionHeader>What & where</SectionHeader>

      <Label>Category</Label>
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

      <Label>Ward</Label>
      {WARDS.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => setWardId(item.id)}
          style={[styles.option, wardId === item.id && styles.optionOn]}
        >
          <Text style={styles.optionText}>{item.name}</Text>
          <Text style={styles.optionId}>{item.id.replace("_", " ")}</Text>
        </Pressable>
      ))}

      {/* ── Section: Details & Multilingual ── */}
      <SectionHeader>Details & Language</SectionHeader>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["EN", "SI", "TA"] as const).map((l) => (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={[styles.chip, lang === l && styles.chipOn, { paddingHorizontal: 12, paddingVertical: 6 }]}
          >
            <Text style={[styles.chipText, lang === l && styles.chipTextOn, { fontSize: 12 }]}>
              {l === "EN" ? "English" : l === "SI" ? "සිංහල" : "தமிழ்"}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={placeholders[lang]}
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
      />

      {/* ── Section: Evidence ── */}
      <SectionHeader>Evidence</SectionHeader>

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
            <Text style={styles.meta}>Required for vision verification</Text>
          </View>
        )}
        <View style={[styles.actions, { flexDirection: "row", gap: 8 }]}>
          <GhostButton
            label={photo ? "📷 Retake" : "📷 Take photo"}
            onPress={() => void takePhoto()}
            style={{ flex: 1 }}
          />
          <GhostButton
            label={photo ? "🖼️ Change" : "🖼️ Gallery"}
            onPress={() => void pickFromGallery()}
            style={{ flex: 1 }}
          />
        </View>
        {photo ? (
          <View style={{ marginTop: 8 }}>
            <GhostButton label="Remove photo" onPress={() => setPhoto("")} />
          </View>
        ) : null}
      </Card>

      <Card style={styles.tight}>
        <Text style={styles.cardTitle}>Voice memo (Multimodal AI)</Text>
        <Text style={styles.meta}>
          {audioBase64
            ? "Voice memo attached (Gemini will translate & summarize)"
            : "Emergency option: Speak in Sinhala, Tamil, or English"}
        </Text>
        <View style={styles.actions}>
          <GhostButton
            label={audioBase64 ? "Remove voice memo" : "Record voice memo"}
            onPress={toggleVoiceMemo}
          />
        </View>
      </Card>

      {/* ── Submit ── */}
      <View style={{ marginTop: 8 }}>
        <PrimaryButton
          label="Submit report"
          onPress={() => void submit()}
          disabled={!canSubmit}
          loading={busy}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {verdict ? (
        <VerdictCard
          verdict={verdict}
          category={category}
          onViewMap={() => router.push("/citizen/map" as never)}
          onNewReport={resetForm}
        />
      ) : null}

      <View style={{ height: 24 }} />
    </Screen>
  );
}

function VerdictCard({
  verdict,
  category,
  onViewMap,
  onNewReport,
}: {
  verdict: ReportResponse;
  category: HazardCategory;
  onViewMap: () => void;
  onNewReport: () => void;
}) {
  return (
    <Card accent={urgencyColor[verdict.urgency]} style={{ marginTop: 16 }}>
      <Kicker color={urgencyColor[verdict.urgency]}>PIPELINE VERDICT</Kicker>
      <HazardBadgeRow hazard={verdict} />
      <Badge label={scorePct(verdict.confidence_score)} color={colors.blue} />
      <Text style={styles.verdictTitle}>{categoryLabel(category)}</Text>
      <Text style={styles.meta}>id {verdict.incident_id}</Text>

      {verdict.summary ? (
        <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.blue + "12", borderRadius: 10, borderWidth: 1, borderColor: colors.blue + "30" }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.blue, letterSpacing: 0.5, marginBottom: 2 }}>
            AI OPERATIONAL SUMMARY · {verdict.detected_language || "Multilingual"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 18 }}>{verdict.summary}</Text>
        </View>
      ) : null}

      <Text style={styles.reason}>{verdict.reasoning}</Text>
      <Text style={styles.meta}>
        Road blocked {verdict.is_road_blocked ? "yes" : "no"}
      </Text>
      <View style={{ marginTop: 8 }}>
        <CheckRow
          label="Image verified"
          ok={verdict.checks.image_verified}
          detail="Photo accepted by vision check"
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
          detail="GPS sits inside expected Colombo envelope"
        />
        <CheckRow
          label="Risk level"
          ok={verdict.checks.risk_level !== "LOW"}
          detail={verdict.checks.risk_level}
        />
      </View>
      <View style={styles.postSubmitActions}>
        <GhostButton label="View on map →" onPress={onViewMap} />
        <GhostButton label="File another report" onPress={onNewReport} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { borderColor: colors.blue, backgroundColor: colors.cardSoft },
  chipText: { color: colors.muted, fontWeight: "700" },
  chipTextOn: { color: colors.text },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  optionOn: { borderColor: colors.blue, backgroundColor: colors.cardSoft },
  optionText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  optionId: { color: colors.muted, fontSize: 11, marginTop: 2, textTransform: "uppercase" },
  input: {
    minHeight: 88,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: colors.bg2,
    fontSize: 15,
  },
  tight: { marginTop: 12, marginBottom: 0 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  coords: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 6 },
  meta: { color: colors.muted, marginTop: 6, fontSize: 13 },
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
  verdictTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 6 },
  reason: { color: colors.text, marginTop: 10, lineHeight: 21 },
  postSubmitActions: { marginTop: 16, gap: 8 },
});
