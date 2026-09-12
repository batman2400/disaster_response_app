"use client";

import {
  ArrowLeft,
  Camera,
  CircleHelp,
  Compass,
  Construction,
  Cpu,
  LifeBuoy,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  PhoneCall,
  RotateCw,
  ShieldAlert,
  TreeDeciduous,
  Waves,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Button, Modal, PipelineStepper, SectionLabel, type PipelineStep } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DEMO_GPS, nearestWard, readFileAsDataUrl } from "@/lib/geo";
import { wardShort } from "@/lib/format";
import type { HazardCategory, ReportResponse, WardId } from "@/lib/types";
import { parseTrace } from "@/lib/trace";

const CATEGORY_CARDS: {
  id: HazardCategory;
  title: string;
  hint: string;
  icon: typeof Waves;
  tone: string;
}[] = [
  { id: "FLOOD", title: "Flood", hint: "Standing water", icon: Waves, tone: "bg-blue-50 text-blue-500" },
  { id: "FALLEN_TREE", title: "Fallen Tree", hint: "Blocked pathway", icon: TreeDeciduous, tone: "bg-emerald-50 text-emerald-500" },
  { id: "BLOCKED_ROAD", title: "Road Damage", hint: "Sinkhole / Collapse", icon: Construction, tone: "bg-amber-50 text-amber-500" },
  { id: "HELP_REQUEST", title: "Need Help", hint: "Rescue request", icon: CircleHelp, tone: "bg-rose-50 text-rose-500" },
];

const WARD_OPTIONS: { id: WardId; name: string; lat: number; lng: number }[] = [
  { id: "ward_01", name: "Ward 01 - Nagalagam St (Kelani Basin)", lat: 6.9535, lng: 79.8732 },
  { id: "ward_02", name: "Ward 02 - Thimbirigasyaya / Town Hall", lat: 6.9271, lng: 79.8612 },
  { id: "ward_03", name: "Ward 03 - Pettah / Colombo Fort", lat: 6.9355, lng: 79.85 },
];

const PIPELINE_META = [
  { id: "image", title: "Vision AI Model", pending: "Awaiting image stream..." },
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
    checks.location_matched ? "Verified: matches GPS" : "Location mismatch",
    `Cluster count: ${checks.cluster_count}`,
    checks.weather_supported ? "Weather supports this report" : "Weather not elevated",
    `Risk: ${checks.risk_level}`,
  ];
}

export function ReportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Rescue specific details
  const [rescuePhone, setRescuePhone] = useState("");
  const [rescuePeopleCount, setRescuePeopleCount] = useState("");
  const [requiresBoat, setRequiresBoat] = useState(false);

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
      const response = await fetch("/api/report", {
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
    } catch (err) {
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
        <Button
          type="button"
          variant="gradient"
          disabled={!canSubmit || busy}
          className="w-full py-4 text-sm font-extrabold"
          onClick={() => void submit()}
        >
          <Cpu className="h-5 w-5" />
          {busy ? "Executing AI Triage…" : "Run AI Triage"}
        </Button>
        {!canSubmit && (
          <p className="text-center text-xs font-semibold text-slate-400">
            {!photo
              ? "• Upload or snap a photo of the hazard"
              : !category
              ? "• Choose an incident classification above"
              : isRescue && !rescuePhone.trim()
              ? "• Add a contact phone number for rescue response"
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
          href="/map"
          title="Back to Live Map"
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
            <span className="hidden sm:inline">Live</span> Map
          </Link>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-brand shadow-sm">
            <Cpu className="h-3.5 w-3.5" />
            Report
          </div>
        </div>

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
          <SectionLabel hint={<span className="rounded-md bg-slate-200/50 px-2 py-1 text-[10px] font-bold text-slate-400">Required</span>}>
            1. Evidence
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
                  <RotateCw className="h-3 w-3" /> Retake
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-sm transition-all group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="text-sm font-extrabold text-slate-700">Tap to scan or upload area</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Capture hazard for AI vision triage</p>
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
                <span className="text-[10px] font-bold text-brand">{gpsLive ? "GPS Locked" : "Ward Preset"}</span>
              </div>
            }
          >
            2. GPS Telemetry
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
                Reporting Ward (Change if remote)
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
          <SectionLabel>3. Incident Classification</SectionLabel>
          <div className="mb-6 grid grid-cols-2 gap-4">
            {CATEGORY_CARDS.map((item) => {
              const Icon = item.icon;
              const selected = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "flex flex-col items-start gap-3 overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-soft transition-all active:scale-95",
                    selected && "border-transparent bg-brand-light/30 ring-2 ring-brand",
                  )}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", item.tone, selected && "scale-110")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-slate-800">{item.title}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{item.hint}</span>
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

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Additional context (landmarks, street names, urgency)..."
            className="mb-6 h-24 w-full resize-none rounded-3xl border border-slate-100 bg-white p-5 text-sm font-semibold text-slate-700 shadow-soft placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
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
            <div className="border-t border-slate-100 bg-white/90 p-6 backdrop-blur">
              <Button type="button" className="w-full py-4" onClick={() => router.push("/map")}>
                Return to Live Map
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Emergency SOS Hotlines Modal */}
      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
