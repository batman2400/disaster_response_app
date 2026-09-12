"use client";

import {
  Activity,
  ArrowLeft,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CircleHelp,
  CloudOff,
  Compass,
  Construction,
  Cpu,
  Droplets,
  Globe,
  LifeBuoy,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  Mic,
  Mountain,
  PhoneCall,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  TreeDeciduous,
  Upload,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Button, Modal, PipelineStepper, SectionLabel, type PipelineStep } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DEMO_GPS, nearestWard, readFileAsDataUrl } from "@/lib/geo";
import { categoryLabel, wardShort } from "@/lib/format";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import {
  getOfflineReports,
  saveOfflineReport,
  setupAutoSync,
  syncAllOfflineReports,
} from "@/lib/offline-queue";
import type { HazardCategory, ReportResponse, WardId } from "@/lib/types";
import { parseTrace } from "@/lib/trace";

const CATEGORY_CARDS: {
  id: HazardCategory;
  title: string;
  hint: string;
  icon: typeof Waves;
  tone: string;
}[] = [
  { id: "FLOOD", title: "Flood / High Water", hint: "River overflow / Standing water", icon: Waves, tone: "bg-blue-50 text-blue-600" },
  { id: "ELECTRICAL_HAZARD", title: "Power Line / Electric", hint: "Downed line / Shock hazard", icon: Zap, tone: "bg-amber-50 text-amber-600" },
  { id: "FALLEN_TREE", title: "Fallen Tree", hint: "Blocked road / Roof damage", icon: TreeDeciduous, tone: "bg-emerald-50 text-emerald-600" },
  { id: "BLOCKED_ROAD", title: "Road Damage", hint: "Sinkhole / Bridge collapse", icon: Construction, tone: "bg-orange-50 text-orange-600" },
  { id: "LANDSLIDE", title: "Landslide / Mudflow", hint: "Earth slip / Unstable slope", icon: Mountain, tone: "bg-stone-100 text-stone-700" },
  { id: "DRAINAGE_OVERFLOW", title: "Drainage / Canal Block", hint: "Culvert burst / Overflow", icon: Droplets, tone: "bg-cyan-50 text-cyan-600" },
  { id: "STRUCTURAL_DAMAGE", title: "Structural Collapse", hint: "Cracked building / Wall collapse", icon: Building2, tone: "bg-purple-50 text-purple-600" },
  { id: "HELP_REQUEST", title: "Rescue / Need Help", hint: "Stranded people / Medical crisis", icon: LifeBuoy, tone: "bg-rose-50 text-rose-600" },
];

const WARD_OPTIONS: { id: WardId; name: string; lat: number; lng: number }[] = [
  { id: "ward_01", name: "Ward 01 - Nagalagam St (Kelani Basin)", lat: 6.9535, lng: 79.8732 },
  { id: "ward_02", name: "Ward 02 - Thimbirigasyaya / Town Hall", lat: 6.9271, lng: 79.8612 },
  { id: "ward_03", name: "Ward 03 - Pettah / Colombo Fort", lat: 6.9355, lng: 79.85 },
];

const LANGUAGE_CONFIG = {
  en: {
    label: "English",
    placeholder: "Additional context (landmarks, street names, urgency)...",
    sampleText: "Rising floodwaters near Nagalagam St bridge, 3 people trapped in house.",
  },
  si: {
    label: "සිංහල",
    placeholder: "අමතර විස්තර (මාර්ග, හඳුනාගැනීමේ ස්ථාන, හදිසි තත්ත්වය)...",
    sampleText: "නගලගම් වීදිය පාලම අසල වතුර පිරිලා, මිනිස්සු තුන්දෙනෙක් කොටුවෙලා ඉන්නවා.",
  },
  ta: {
    label: "தமிழ்",
    placeholder: "கூடுதல் விவரங்கள் (அடையாளங்கள், தெருப் பெயர்கள், அவசரநிலை)...",
    sampleText: "நாகலகம் வீதி பாலம் அருகில் வெள்ள நீர் புகுந்துள்ளது, 3 பேர் சிக்கியுள்ளனர்.",
  },
} as const;

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

const PIPELINE_META = [
  { id: "image", title: "Vision AI Model", pending: "Awaiting image stream..." },
  { id: "summary", title: "Multilingual & Voice AI", pending: "Analyzing voice audio & translation..." },
  { id: "location", title: "Metadata Locator", pending: "Pending..." },
  { id: "cluster", title: "PostGIS Cluster Check", pending: "Pending..." },
  { id: "weather", title: "Weather Telemetry", pending: "Pending..." },
  { id: "risk", title: "Risk Assessment AI", pending: "Pending..." },
] as const;

function idleSteps(): PipelineStep[] {
  return PIPELINE_META.map((step) => ({
    id: step.id,
    title: step.title,
    detail: step.pending,
    state: "idle",
  }));
}

function detailsFromVerdict(verdict: ReportResponse): string[] {
  const checks = verdict.checks;
  return [
    checks.image_verified ? "Verified: image matches category" : "Low confidence on image",
    verdict.summary ? `[${verdict.detected_language || "AI"}] ${verdict.summary}` : "Input synthesized",
    checks.location_matched ? "Verified: matches GPS" : "Location mismatch",
    `Cluster count: ${checks.cluster_count}`,
    checks.weather_supported ? "Weather supports this report" : "Weather not elevated",
    `Risk: ${checks.risk_level}`,
  ];
}

export function ReportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, t } = useI18n();
  const [photo, setPhoto] = useState("");
  const [category, setCategory] = useState<HazardCategory | null>(null);
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(DEMO_GPS.lat);
  const [lng, setLng] = useState(DEMO_GPS.lng);
  const [wardId, setWardId] = useState<WardId>("ward_01");
  const [gpsLive, setGpsLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>(idleSteps);
  const [verdict, setVerdict] = useState<ReportResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Voice recording & Multilingual states
  const [audioBase64, setAudioBase64] = useState<string>("");
  const [audioMime, setAudioMime] = useState<string>("audio/webm");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "si" | "ta">(lang);

  useEffect(() => {
    setSelectedLanguage(lang);
  }, [lang]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Rescue specific details
  const [rescuePhone, setRescuePhone] = useState("");
  const [rescuePeopleCount, setRescuePeopleCount] = useState("");
  const [requiresBoat, setRequiresBoat] = useState(false);

  // Offline queue states
  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineSavedNotice, setOfflineSavedNotice] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const refreshOfflineCount = async () => {
    try {
      const list = await getOfflineReports();
      setOfflineCount(list.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshOfflineCount();
    const cleanup = setupAutoSync(() => {
      refreshOfflineCount();
    });
    return () => {
      cleanup();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncingOffline(true);
    try {
      const { success, failed } = await syncAllOfflineReports();
      await refreshOfflineCount();
      if (success > 0) {
        setOfflineSavedNotice(false);
      }
    } finally {
      setSyncingOffline(false);
    }
  };

  const startRecording = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setAudioBase64(result);
          setAudioMime(mimeType);
        };
        reader.readAsDataURL(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));

        // Stop mic hardware stream
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access unavailable. You can upload an audio file or click Demo Sinhala.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const removeAudio = () => {
    if (isRecording) stopRecording();
    setAudioBase64("");
    setAudioMime("audio/webm");
    setAudioUrl("");
    setRecordingDuration(0);
  };

  const handleAudioFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAudioBase64(dataUrl);
      setAudioMime(file.type || "audio/mp3");
      setAudioUrl(URL.createObjectURL(file));
    } catch {
      setError("Failed to read audio file.");
    }
  };

  const loadDemoSinhalaAudio = () => {
    setDescription("නගලගම් වීදිය පාලම අසල වතුර අඩි 4ක් පිරිලා, පාර සම්පූර්ණයෙන්ම වැහිලා. මිනිස්සු 3 දෙනෙක් කොටුවෙලා ඉන්නවා.");
    setSelectedLanguage("si");
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const sampleRate = 16000;
      const numSamples = sampleRate * 1.5;
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        data[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.2;
      }
      const wavBytes = encodeWav(data, sampleRate);
      const blob = new Blob([wavBytes], { type: "audio/wav" });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioBase64(reader.result as string);
        setAudioMime("audio/wav");
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingDuration(2);
      };
      reader.readAsDataURL(blob);
    } catch {
      // AudioContext fallback
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(5));
        const nextLng = Number(pos.coords.longitude.toFixed(5));
        setLat(nextLat);
        setLng(nextLng);
        setWardId(nearestWard(nextLat, nextLng));
        setGpsLive(true);
      },
      () => setGpsLive(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  function onSelectWard(nextWardId: WardId) {
    setWardId(nextWardId);
    if (!gpsLive) {
      const match = WARD_OPTIONS.find((w) => w.id === nextWardId);
      if (match) {
        setLat(match.lat);
        setLng(match.lng);
      }
    }
  }

  const isRescue = category === "HELP_REQUEST";
  const canSubmit = Boolean(photo && category && (!isRescue || rescuePhone.trim().length > 0));

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto(await readFileAsDataUrl(file));
  }

  function getOrCreateReporterId(): string {
    if (typeof window === "undefined") return "rep-web-client";
    try {
      let id = localStorage.getItem("fender_reporter_id");
      if (!id) {
        id = `rep-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem("fender_reporter_id", id);
      }
      return id;
    } catch {
      return "rep-fallback-client";
    }
  }

  async function submit() {
    if (!category || !photo) return;
    if (isRescue && !rescuePhone.trim()) {
      setError("Please provide a contact phone number for rescue coordination.");
      return;
    }

    setBusy(true);
    setError("");
    setVerdict(null);
    setSteps(idleSteps());
    setModalOpen(true);

    let cursor = 0;
    const tick = window.setInterval(() => {
      setSteps((prev) =>
        prev.map((step, index) => {
          if (index < cursor) return { ...step, state: "running", detail: "Processing data..." };
          return step;
        }),
      );
      cursor += 1;
    }, 450);

    const fullDescription = [
      isRescue && rescuePhone ? `[CALLBACK: ${rescuePhone.trim()}]` : null,
      isRescue && rescuePeopleCount ? `[STRANDED: ${rescuePeopleCount.trim()}]` : null,
      isRescue && requiresBoat ? `[BOAT REQUIRED]` : null,
      description.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const response = await fetch("/api/report?mode=fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          ward_id: wardId,
          category,
          photo_base64: photo,
          help_request: isRescue,
          description: fullDescription,
          reporter_id: getOrCreateReporterId(),
          audio_base64: audioBase64 || undefined,
          audio_mime: audioBase64 ? audioMime : undefined,
        }),
      });
      const payload = (await response.json()) as ReportResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Report failed");
      const details = detailsFromVerdict(payload);
      const captured = parseTrace(payload.trace);
      setSteps(
        PIPELINE_META.map((step, index) => {
          const traced = captured?.steps.find((item) => item.id === step.id);
          return {
            id: step.id,
            title: step.title,
            detail: traced?.detail ?? details[index],
            state: "pass",
          };
        }),
      );
      setVerdict(payload);

      // Save to My Reports in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("fender_my_reports") || "[]");
        const updated = [payload.incident_id, ...stored.filter((id: string) => id !== payload.incident_id)];
        localStorage.setItem("fender_my_reports", JSON.stringify(updated.slice(0, 15)));
      } catch {
        // ignore
      }
    } catch (err) {
      const isNetworkIssue =
        typeof navigator !== "undefined" &&
        (!navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch")));

      if (isNetworkIssue) {
        try {
          await saveOfflineReport({
            lat,
            lng,
            ward_id: wardId,
            category: category!,
            photo_base64: photo,
            help_request: isRescue,
            description: fullDescription,
            reporter_id: getOrCreateReporterId(),
            audio_base64: audioBase64 || undefined,
            audio_mime: audioBase64 ? audioMime : undefined,
          });
          setOfflineSavedNotice(true);
          await refreshOfflineCount();
          setModalOpen(false);
          return;
        } catch (queueErr) {
          console.warn("Failed to queue offline report:", queueErr);
        }
      }

      setError(err instanceof Error ? err.message : "Report failed");
      setModalOpen(false);
    } finally {
      window.clearInterval(tick);
      setBusy(false);
    }
  }

  function SubmitButton() {
    return (
      <div className="flex flex-col gap-2">
        {error && (
          <div className="mb-2 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm animate-pop">
            <ShieldAlert className="h-5 w-5 text-status-crimson shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-rose-900">Submission Alert</p>
              <p className="font-medium leading-relaxed text-rose-700">{error}</p>
            </div>
          </div>
        )}
        <Button
          type="button"
          variant="gradient"
          disabled={!canSubmit || busy}
          className="w-full py-4 text-sm font-extrabold"
          onClick={() => void submit()}
        >
          <Cpu className="h-5 w-5" />
          {busy
            ? lang === "si"
              ? "AI පරීක්ෂාව ක්‍රියාත්මක වේ…"
              : lang === "ta"
              ? "AI மதிப்பீடு செய்யப்படுகிறது…"
              : "Executing AI Triage…"
            : lang === "si"
            ? "AI පරීක්ෂාව අරඹන්න"
            : lang === "ta"
            ? "AI மதிப்பீட்டை இயக்கவும்"
            : "Run AI Triage"}
        </Button>
        {!canSubmit && (
          <p className="text-center text-xs font-semibold text-slate-400">
            {!photo
              ? lang === "si"
                ? "• ආපදා ස්ථානයේ ඡායාරූපයක් එක් කරන්න"
                : lang === "ta"
                ? "• ஆபத்து பகுதியை புகைப்படம் எடுக்கவும்"
                : "• Upload or snap a photo of the hazard"
              : !category
              ? lang === "si"
                ? "• ඉහතින් අනතුරු වර්ගය තෝරන්න"
                : lang === "ta"
                ? "• மேலே உள்ள ஆபத்து வகையை தேர்ந்தெடுக்கவும்"
                : "• Choose an incident classification above"
              : isRescue && !rescuePhone.trim()
              ? lang === "si"
                ? "• මුදවා ගැනීමේ කණ්ඩායම සඳහා දුරකථන අංකයක් ඇතුළත් කරන්න"
                : lang === "ta"
                ? "• தொடர்பு தொலைபேசி எண்ணைச் சேர்க்கவும்"
                : "• Add a contact phone number for rescue response"
              : lang === "si"
              ? "AI පරීක්ෂාවට සූදානම්"
              : lang === "ta"
              ? "AI மதிப்பீட்டிற்கு தயார்"
              : "Ready to run AI triage"}
          </p>
        )}
      </div>
    );
  }

  return (
    <PublicShell>
      {/* Top Header with Citizen Navigation Switcher and SOS Button */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/20 bg-white/80 px-6 py-3.5 backdrop-blur-lg lg:px-10">
        <Link
          href="/"
          title="Return to Home"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Navigation Switcher: Map vs Report */}
        <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner">
          <Link
            href="/map"
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-brand"
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("live_map")}</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-brand shadow-sm">
            <Cpu className="h-3.5 w-3.5" />
            {t("report_hazard")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {offlineCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncingOffline}
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3 text-xs font-extrabold text-amber-900 shadow-sm animate-pulse"
              title="Reports queued locally while offline. Click to sync."
            >
              <CloudOff className="h-4 w-4 text-amber-600" />
              <span>{syncingOffline ? "Syncing…" : `${offlineCount} Offline`}</span>
            </button>
          )}

          <LanguageSwitcher />

          {/* SOS Emergency Hotline Button */}
          <button
            type="button"
            onClick={() => setSosModalOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-500 px-3 text-xs font-extrabold text-white shadow-md shadow-rose-500/20 active:scale-95"
          >
            <ShieldAlert className="h-4 w-4 animate-pulse" />
            <span className="hidden sm:inline">SOS</span> 117
          </button>
        </div>
      </div>

      {/* Offline Saved Non-Blocking Banner */}
      {offlineSavedNotice && (
        <div className="mx-6 mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm lg:mx-10 animate-slide-down">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CloudOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Report Saved to Offline Emergency Queue
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-amber-800">
                  Network connection is currently unavailable. Your photo, location, and hazard details are secured locally on your device and will auto-sync with municipal response as soon as connectivity resumes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOfflineSavedNotice(false)}
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Emergency Broadcast Marquee */}
      <div className="px-6 pt-3 lg:px-10">
        <EmergencyBroadcastBanner />
      </div>

      {/* Emergency Helpline Quick-Strip */}
      <div className="border-b border-rose-100 bg-rose-50/70 px-6 py-2.5 backdrop-blur-sm lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-rose-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>Flood Emergency? Direct Responders:</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:117" className="flex items-center gap-1 font-bold text-rose-700 underline hover:text-rose-800">
              <PhoneCall className="h-3 w-3" /> 117 (DMC)
            </a>
            <span className="text-rose-300">|</span>
            <a href="tel:1990" className="flex items-center gap-1 font-bold text-rose-700 underline hover:text-rose-800">
              <PhoneCall className="h-3 w-3" /> 1990 (Ambulance)
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pb-10">
        <div>
          {/* Section 1: Evidence */}
          <SectionLabel hint={<span className="rounded-md bg-slate-200/50 px-2 py-1 text-[10px] font-bold text-slate-400">{lang === "si" ? "අනිවාර්යයි" : lang === "ta" ? "கட்டாயம்" : "Required"}</span>}>
            {lang === "si" ? "1. සාක්ෂි / ඡායාරූපය" : lang === "ta" ? "1. ஆதாரம் / புகைப்படம்" : "1. Evidence"}
          </SectionLabel>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group relative mb-6 flex h-56 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100 shadow-soft transition-all active:scale-[0.98]",
              photo && "border-solid border-brand ring-4 ring-blue-500/20",
            )}
          >
            {photo ? (
              <>
                <img src={photo} alt="Captured hazard" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
                  <RotateCw className="h-3 w-3" /> {lang === "si" ? "නැවත ගන්න" : lang === "ta" ? "மீண்டும் எடுக்க" : "Retake"}
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-sm transition-all group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="text-sm font-extrabold text-slate-700">
                  {lang === "si" ? "ඡායාරූපයක් ගැනීමට හෝ තේරීමට ඔබන්න" : lang === "ta" ? "புகைப்படம் எடுக்க அல்லது பதிவேற்ற தட்டவும்" : "Tap to scan or upload area"}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {lang === "si" ? "AI පරීක්ෂාව සඳහා ඡායාරූපය ලබාගන්න" : lang === "ta" ? "AI பகுப்பாய்விற்கு புகைப்படம் எடுக்கவும்" : "Capture hazard for AI vision triage"}
                </p>
              </div>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void onPickPhoto(event.target.files?.[0])}
          />

          {/* Section 2: GPS Telemetry & Ward Selector */}
          <SectionLabel
            hint={
              <div className="flex items-center gap-1.5 rounded-md border border-brand-light bg-brand-light/50 px-2 py-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", gpsLive ? "animate-pulse bg-brand" : "bg-slate-400")} />
                <span className="text-[10px] font-bold text-brand">{gpsLive ? (lang === "si" ? "GPS තහවුරුයි" : lang === "ta" ? "GPS இணைக்கப்பட்டது" : "GPS Locked") : (lang === "si" ? "කොට්ඨාශය" : lang === "ta" ? "பிரிவு" : "Ward Preset")}</span>
              </div>
            }
          >
            {lang === "si" ? "2. ජී.පී.එස්. පිහිටීම" : lang === "ta" ? "2. GPS இருப்பிடம்" : "2. GPS Telemetry"}
          </SectionLabel>
          <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="pointer-events-none absolute inset-0 z-0 bg-grid-pattern opacity-40" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-brand">
                <LocateFixed className="h-5 w-5" />
                <div className="absolute inset-0 animate-ping rounded-2xl border-2 border-brand opacity-20" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">{wardShort(wardId)}</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">Colombo flood basin</p>
                <div className="mt-2 flex gap-3">
                  <span className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-400">
                    LAT: {lat.toFixed(4)}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-400">
                    LNG: {lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Ward Switcher */}
            <div className="relative z-10 mt-4 border-t border-slate-100 pt-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "si" ? "වාර්තා කරන කොට්ඨාශය (වෙනස් කළ හැක)" : lang === "ta" ? "அறிக்கையிடும் பிரிவு (தேவைப்பட்டால் மாற்றலாம்)" : "Reporting Ward (Change if remote)"}
              </label>
              <select
                value={wardId}
                onChange={(e) => onSelectWard(e.target.value as WardId)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-brand focus:outline-none"
              >
                {WARD_OPTIONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {/* Section 3: Incident Classification */}
          <SectionLabel>
            {lang === "si" ? "3. අනතුරු වර්ගීකරණය" : lang === "ta" ? "3. விபத்து வகைப்பாடு" : "3. Incident Classification"}
          </SectionLabel>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
            {CATEGORY_CARDS.map((item) => {
              const Icon = item.icon;
              const selected = category === item.id;
              const title = categoryLabel(item.id, lang);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "flex flex-col items-start gap-2.5 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-soft transition-all active:scale-95",
                    selected && "border-transparent bg-brand-light/30 ring-2 ring-brand",
                  )}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", item.tone, selected && "scale-110")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 leading-snug">{title}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-400 leading-tight">{item.hint}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Special Rescue Sub-form for "Need Help" */}
          {isRescue && (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-soft animate-pop">
              <div className="mb-3 flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-rose-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                  Rescue Coordination Details
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={rescuePhone}
                    onChange={(e) => setRescuePhone(e.target.value)}
                    placeholder="e.g. 077 123 4567"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600">
                    Number of Trapped Persons & Urgency
                  </label>
                  <input
                    type="text"
                    value={rescuePeopleCount}
                    onChange={(e) => setRescuePeopleCount(e.target.value)}
                    placeholder="e.g. 4 people (1 elderly, 1 infant)"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresBoat}
                    onChange={(e) => setRequiresBoat(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Water level requires boat / watercraft rescue</span>
                </label>
              </div>
            </div>
          )}

          {/* Section 4: Voice Recording & Multilingual Context */}
          <SectionLabel
            hint={
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand">
                <Globe className="h-3 w-3" />
                <span>Sinhala · Tamil · English</span>
              </div>
            }
          >
            {lang === "si" ? "4. අමතර විස්තර සහ හඬ පටය" : lang === "ta" ? "4. கூடுதல் விவரங்கள் & குரல் பதிவு" : "4. Voice Memo & Context (AI Multimodal)"}
          </SectionLabel>

          <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
            {/* Language Quick Selector */}
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "si" ? "භාෂාව" : lang === "ta" ? "உள்ளீட்டு மொழி" : "Input Language"}
              </span>
              <div className="flex items-center gap-1.5">
                {(["en", "si", "ta"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setSelectedLanguage(l)}
                    className={cn(
                      "rounded-xl px-2.5 py-1 text-xs font-bold transition-all",
                      selectedLanguage === l
                        ? "bg-brand text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {LANGUAGE_CONFIG[l].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Memo Recording Studio */}
            <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              {!audioBase64 && !isRecording ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-brand-indigo active:scale-95"
                    >
                      <Mic className="h-4 w-4" />
                      <span>Record Voice Memo</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        title="Attach audio file (.mp3, .wav, .m4a, .webm)"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Upload Audio</span>
                      </button>
                      <button
                        type="button"
                        onClick={loadDemoSinhalaAudio}
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        title="Load demo Sinhala voice note to test AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Demo Sinhala</span>
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    Tap to speak directly in Sinhala, Tamil, or English. Gemini automatically translates, extracts landmarks, and synthesizes operational brief.
                  </p>
                </div>
              ) : isRecording ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Recording Voice Memo...</p>
                      <p className="font-mono text-xs font-semibold text-rose-600">
                        {Math.floor(recordingDuration / 60)
                          .toString()
                          .padStart(2, "0")}
                        :
                        {(recordingDuration % 60).toString().padStart(2, "0")} / 02:00
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop & Attach</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Voice Memo Attached</p>
                        <p className="text-[10px] font-medium text-emerald-600">
                          Ready for Gemini audio inference & translation
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAudio}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                  {audioUrl ? (
                    <div className="space-y-1.5">
                      <audio src={audioUrl} controls className="h-9 w-full rounded-lg" />
                      {recordingDuration > 0 && recordingDuration < 2 ? (
                        <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-md p-1.5 border border-amber-200">
                          ⚠️ Recording is very brief ({recordingDuration}s). If only clicking or ambient noise was recorded, emergency AI will detect no spoken words. Speak clearly for 2-5 seconds for full translation.
                        </p>
                      ) : (
                        <p className="text-[10px] font-medium text-slate-500">
                          💡 Tip: Ensure you speak clearly about the hazard location and severity so the AI can transcribe and translate.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => void handleAudioFile(e.target.files?.[0])}
            />

            {/* Multilingual Textarea */}
            <div className="relative">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={LANGUAGE_CONFIG[selectedLanguage].placeholder}
                className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-300 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              {!description && (
                <button
                  type="button"
                  onClick={() => setDescription(LANGUAGE_CONFIG[selectedLanguage].sampleText)}
                  className="absolute bottom-3 right-3 text-[10px] font-bold text-brand hover:underline"
                >
                  Insert {LANGUAGE_CONFIG[selectedLanguage].label} sample →
                </button>
              )}
            </div>
          </div>
          {error ? <p className="mb-4 text-sm font-semibold text-status-crimson">{error}</p> : null}

          <div className="mt-auto hidden lg:block">
            <SubmitButton />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Submit Button */}
      <div className="pointer-events-none absolute bottom-0 z-20 w-full p-6 lg:hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent" />
        <div className="pointer-events-auto">
          <SubmitButton />
        </div>
      </div>

      {/* AI Pipeline Triage Modal */}
      <Modal open={modalOpen}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">System Triage</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand">
                  {verdict ? "Pipeline complete" : "AI Pipeline Running"}
                </p>
              </div>
              {!verdict ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
              ) : null}
            </div>

            <div className="relative mb-8 h-32 overflow-hidden rounded-2xl border border-slate-200">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : null}
              {!verdict ? <div className="animate-scan" /> : null}
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-[9px] text-emerald-400 backdrop-blur">
                {verdict ? "ANALYSIS COMPLETE" : "ANALYZING MATRIX"}
              </div>
            </div>

            <PipelineStepper steps={steps} />

            {/* AI Multilingual Translation & Operational Brief Card */}
            {verdict?.summary ? (
              <div className="relative mt-6 overflow-hidden rounded-[24px] border border-blue-100 bg-blue-50/70 p-5 shadow-md animate-pop">
                <div className="flex items-center justify-between mb-3 border-b border-blue-200/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand" />
                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand">
                      AI Multilingual Ingestion Verdict
                    </span>
                  </div>
                  {verdict.detected_language ? (
                    <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase shadow-sm">
                      {verdict.detected_language}
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Standardized Operational English Brief
                  </span>
                  <p className="mt-1 text-sm font-extrabold leading-relaxed text-slate-900">
                    {verdict.summary}
                  </p>
                </div>
              </div>
            ) : null}

            {verdict ? (
              <div className="relative mt-6 overflow-hidden rounded-[24px] bg-slate-900 p-6 shadow-xl animate-pop">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500 opacity-20 blur-[40px]" />
                <div className="relative z-10 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Aggregator Verdict
                    </span>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {verdict.confidence_score.toFixed(2)} CONF
                    </span>
                  </div>
                </div>
                <h3 className="relative z-10 mb-2 text-3xl font-extrabold tracking-tight text-white">
                  {verdict.status.replaceAll("_", " ")}
                </h3>
                <p className="relative z-10 text-[13px] font-medium leading-relaxed text-slate-300">
                  {verdict.reasoning}
                </p>
              </div>
            ) : null}
          </div>

          {verdict ? (
            <div className="border-t border-slate-100 bg-white/90 p-6 backdrop-blur space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Public Tracking Reference
                  </span>
                  <span className="font-mono text-sm font-black text-slate-900">
                    #CLM-{verdict.incident_id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(verdict.incident_id);
                    alert("Tracking Reference ID copied to clipboard!");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                >
                  Copy ID
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="gradient"
                  className="w-full py-3.5 text-xs font-extrabold"
                  onClick={() => router.push(`/report/track/${verdict.incident_id}`)}
                >
                  <Activity className="h-4 w-4" />
                  Track Live Status
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full py-3.5 text-xs font-extrabold"
                  onClick={() => router.push("/map")}
                >
                  Return to Map
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Emergency SOS Hotlines Modal */}
      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
