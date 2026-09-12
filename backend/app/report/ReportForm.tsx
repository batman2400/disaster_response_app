"use client";

import {
  ArrowLeft,
  Camera,
  CircleHelp,
  Cpu,
  LoaderCircle,
  LocateFixed,
  RotateCw,
  TreeDeciduous,
  Waves,
  Construction,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

  const canSubmit = Boolean(photo && category);

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto(await readFileAsDataUrl(file));
  }

  async function submit() {
    if (!category || !photo) return;
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
          help_request: category === "HELP_REQUEST",
          description,
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
      <Button
        type="button"
        variant="gradient"
        disabled={!canSubmit || busy}
        className="w-full py-4"
        onClick={() => void submit()}
      >
        <Cpu className="h-5 w-5" />
        Run AI Triage
      </Button>
    );
  }

  return (
    <PublicShell>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/20 bg-white/70 px-6 py-4 backdrop-blur-lg lg:px-10">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Report Hazard</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pb-10">
        <div>
        <SectionLabel hint={<span className="rounded-md bg-slate-200/50 px-2 py-1 text-[10px] font-bold text-slate-400">Required</span>}>
          1. Evidence
        </SectionLabel>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative mb-8 flex h-56 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100 shadow-soft transition-all active:scale-[0.98]",
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
              <p className="text-sm font-extrabold text-slate-700">Tap to scan area</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Capture hazard for AI analysis</p>
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

        <SectionLabel
          hint={
            <div className="flex items-center gap-1.5 rounded-md border border-brand-light bg-brand-light/50 px-2 py-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", gpsLive ? "animate-pulse bg-brand" : "bg-slate-400")} />
              <span className="text-[10px] font-bold text-brand">{gpsLive ? "Live Lock" : "Demo pin"}</span>
            </div>
          }
        >
          2. GPS Telemetry
        </SectionLabel>
        <div className="relative mb-8 flex items-center gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
          <div className="pointer-events-none absolute inset-0 z-0 bg-grid-pattern opacity-40" />
          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-brand">
            <LocateFixed className="h-5 w-5" />
            <div className="absolute inset-0 animate-ping rounded-2xl border-2 border-brand opacity-20" />
          </div>
          <div className="relative z-10 flex-1">
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
        </div>

        <div className="flex flex-col">
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
                  "flex flex-col items-start gap-3 overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-soft transition-all",
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

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Additional context (Optional)..."
          className="mb-8 h-24 w-full resize-none rounded-3xl border border-slate-100 bg-white p-5 text-sm font-semibold text-slate-700 shadow-soft placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light lg:mb-6"
        />
        {error ? <p className="mb-4 text-sm font-semibold text-status-crimson">{error}</p> : null}
        <div className="mt-auto hidden lg:block">
          <SubmitButton />
        </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 z-20 w-full p-6 lg:hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent" />
        <div className="pointer-events-auto">
          <SubmitButton />
        </div>
      </div>

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
                Return to Map
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </PublicShell>
  );
}
