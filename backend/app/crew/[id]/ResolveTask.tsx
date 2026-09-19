"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PublicShell } from "@/components/public-shell";
import { Badge, Button, SectionLabel, StatusBadge, UrgencyBadge } from "@/components/ui";
import { LanguageSwitcher } from "@/lib/i18n/language-context";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { readFileAsDataUrl, safeFetchJson } from "@/lib/geo";
import { latestDispatchNote } from "@/lib/officer-log";
import { ROLE_THEME } from "@/lib/role-theme";
import type { HazardRow } from "@/lib/types";

type CrewMilestone = "ASSIGNED" | "EN_ROUTE" | "ON_SITE" | "WORKING";

export function ResolveTask({ hazard }: { hazard: HazardRow }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [milestone, setMilestone] = useState<CrewMilestone>(
    hazard.dispatched_at ? "EN_ROUTE" : "ASSIGNED"
  );
  const [photo, setPhoto] = useState("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Safety checklist items
  const [checks, setChecks] = useState({
    drainCleared: true,
    powerSafe: true,
    trafficOpen: true,
  });

  const [comparisonMode, setComparisonMode] = useState<"side-by-side" | "after-only">("side-by-side");

  async function onPick(file: File | undefined) {
    if (!file) return;
    const data = await readFileAsDataUrl(file);
    setPhoto(data);
    setVerified(false);
    setScanning(true);

    // AI Clearance Verification simulation
    window.setTimeout(() => {
      setScanning(false);
      setVerified(true);
    }, 1400);
  }

  function addQuickTag(tag: string) {
    setNotes((prev) => (prev ? `${prev.trim()}, ${tag}` : tag));
  }

  async function submit() {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: hazard.id,
          closure_photo_base64: photo,
          resolution_notes: notes,
        }),
      });
      const res = await safeFetchJson<{ error?: string }>(response, "Resolution failed");
      if (!res.ok) throw new Error(res.error || "Resolve failed");
      setDone(true);
      window.setTimeout(() => router.push("/crew"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  const theme = ROLE_THEME.crew;
  const Icon = theme.icon;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${hazard.lat},${hazard.lng}`;

  return (
    <PublicShell>
      {/* Top Header */}
      <div className={cn("relative z-10 flex items-center justify-between border-t-4 px-5 py-4 lg:px-8", theme.accent)}>
        <Link
          href="/crew"
          title="Back to Queue"
          className="flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks Queue</span>
        </Link>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm", theme.iconBg)}>
              <Icon className="h-4 w-4" />
            </span>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 lg:text-lg">Incident Resolution</h1>
          </div>
          <p className={cn("mt-0.5 font-mono text-[10px] font-bold uppercase tracking-widest", theme.chipText)}>
            Case #{hazard.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Turn-by-Turn in Google Maps"
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-100 active:scale-95"
          >
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">Navigate</span>
          </a>
        </div>
      </div>

      {/* Main Resolution Workspace */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-5 pb-36 pt-2 lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-12">
        {/* Left Column: Mission Overview, Milestones & Before Photo */}
        <div className="flex flex-col gap-5">
          {/* Mission Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={hazard.status} />
                  <UrgencyBadge urgency={hazard.urgency} />
                  {hazard.is_road_blocked && (
                    <Badge className="bg-rose-500 text-white font-extrabold shadow-sm">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      ROAD BLOCKED
                    </Badge>
                  )}
                  {hazard.dispatched_at && (
                    <Badge className="bg-indigo-600 text-white font-extrabold shadow-sm">
                      <Truck className="mr-1 h-3 w-3" />
                      DISPATCHED
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">{categoryLabel(hazard.category)}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <LocateFixed className="h-3.5 w-3.5 text-slate-400" />
                  {wardShort(hazard.ward_id)} · Reported {timeAgo(hazard.created_at)}
                </p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                  GPS: {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
                </p>
              </div>

              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-center transition-all hover:bg-blue-100"
              >
                <Navigation className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-[10px] font-extrabold text-blue-700">Get Route</span>
              </a>
            </div>

            {/* Description / Officer Notes */}
            {hazard.description && (
              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-700">
                <span className="font-bold text-slate-900">Reporter description: </span>
                {hazard.description}
              </div>
            )}

            {hazard.dispatched_at && (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-800">
                    Officer Dispatch Order:
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-indigo-950">
                    {latestDispatchNote(hazard) || "Proceed with emergency pumping equipment. Photograph reopened road."}
                  </p>
                </div>
              </div>
            )}

            {/* Milestone Tracker */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                Operational Milestone:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMilestone("EN_ROUTE")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-extrabold transition-all border",
                    milestone === "EN_ROUTE"
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Truck className="h-4 w-4 mb-0.5" />
                  <span>En Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMilestone("ON_SITE")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-extrabold transition-all border",
                    milestone === "ON_SITE"
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <MapPin className="h-4 w-4 mb-0.5" />
                  <span>On Site</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMilestone("WORKING")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-extrabold transition-all border",
                    milestone === "WORKING"
                      ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Wrench className="h-4 w-4 mb-0.5" />
                  <span>Working</span>
                </button>
              </div>
            </div>
          </div>

          {/* Citizen Reported Evidence (Before Photo) */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel hint={<span className="font-bold text-slate-500">Citizen Evidence</span>}>
                Original Report (Before)
              </SectionLabel>
              <span className="text-[10px] font-bold text-slate-400">
                Confidence: {Math.round(hazard.confidence_score * 100)}%
              </span>
            </div>

            {hazard.photo_url ? (
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                <img
                  src={hazard.photo_url}
                  alt="Citizen report photo"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  Before: {categoryLabel(hazard.category)}
                </div>
              </div>
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <Camera className="h-8 w-8 mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">No original photo submitted</p>
                <p className="text-[11px] text-slate-400">Reporter submitted text-only dispatch</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: After-Fix Photo, Verification & Resolution */}
        <div className="flex flex-col gap-5 mt-5 lg:mt-0">
          {/* After Photo Capture */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel
                hint={
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Required for Close
                  </span>
                }
              >
                After-Fix Photo Clearance
              </SectionLabel>
              {photo && hazard.photo_url && (
                <button
                  type="button"
                  onClick={() => setComparisonMode((m) => (m === "side-by-side" ? "after-only" : "side-by-side"))}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  {comparisonMode === "side-by-side" ? "Show Single Photo" : "Compare Before/After"}
                </button>
              )}
            </div>

            {/* Comparison or Capture View */}
            {photo && hazard.photo_url && comparisonMode === "side-by-side" ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                  <img src={hazard.photo_url} alt="Before" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    BEFORE (HAZARD)
                  </span>
                </div>
                <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-emerald-500 bg-slate-900">
                  <img src={photo} alt="After" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    AFTER (CLEARED)
                  </span>
                </div>
              </div>
            ) : null}

            {/* Photo preview area */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className={cn(
                "relative flex h-56 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 transition-all active:scale-[0.98]",
                photo && "border-solid",
                verified && "border-emerald-500 ring-4 ring-emerald-500/15",
                photo && !verified && "border-indigo-500"
              )}
            >
              {photo ? (
                <img src={photo} alt="After-fix" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center px-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-800">Photograph or upload cleared site</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Capture clear roadway, unblocked drains, and receding water.
                  </p>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                  <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    AI Scanning Clearance…
                  </span>
                </div>
              )}

              {verified && (
                <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg">
                  <Sparkles className="h-3.5 w-3.5" /> AI Verified Clear
                </span>
              )}
            </button>

            {/* Camera / Gallery action buttons */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                <Camera className="h-4 w-4 text-indigo-600" />
                <span>{photo ? "Retake (Camera)" : "Take Photo"}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                <span>{photo ? "Change (Gallery)" : "Upload from Gallery"}</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0])}
            />

            {/* AI Verification Criteria Badges */}
            {verified && (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 mb-2">
                  Clearance Audit Results:
                </p>
                <div className="flex flex-col gap-1 text-xs font-semibold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Roadway passable for civilian vehicles
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Water depth below flood risk threshold
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Debris and obstacles cleared from perimeter
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Safety Checklist */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <SectionLabel hint={<span className="font-bold text-slate-500">Safety Protocol</span>}>
              Operational Clearance Checklist
            </SectionLabel>
            <div className="flex flex-col gap-2.5 mt-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={checks.drainCleared}
                  onChange={(e) => setChecks((c) => ({ ...c, drainCleared: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600"
                />
                <span>Drainage channels & culverts cleared of debris</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={checks.powerSafe}
                  onChange={(e) => setChecks((c) => ({ ...c, powerSafe: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600"
                />
                <span>No live electrical wires or submerged hazards present</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={checks.trafficOpen}
                  onChange={(e) => setChecks((c) => ({ ...c, trafficOpen: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600"
                />
                <span>Road reopened: barricades removed and traffic safe to pass</span>
              </label>
            </div>
          </div>

          {/* Resolution Notes with Quick Tags */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <SectionLabel>Resolution Notes & Action Report</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
              {["Water pumped", "Culverts cleared", "Tree removed", "Passable for cars", "Police assisted"].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addQuickTag(tag)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                  >
                    + {tag}
                  </button>
                )
              )}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pumped water, debris cleared from main culvert. Road is fully passable for emergency and civilian vehicles."
              className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />

            {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}

            <div className="mt-4 hidden lg:block">
              <Button
                type="button"
                variant="success"
                disabled={!verified || busy}
                className="w-full rounded-2xl py-4 font-extrabold text-sm shadow-md"
                onClick={() => void submit()}
              >
                <Check className="h-5 w-5 mr-1" />
                {busy ? "Updating System & Public Map…" : "Close Task & Mark Road Open"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 p-4 lg:hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent" />
        <Button
          type="button"
          variant="success"
          disabled={!verified || busy}
          className="pointer-events-auto w-full rounded-2xl py-4 font-extrabold text-sm shadow-xl"
          onClick={() => void submit()}
        >
          <Check className="h-5 w-5 mr-1" />
          {busy ? "Updating System…" : "Close Task & Mark Road Open"}
        </Button>
      </div>

      {/* Resolution Success Overlay */}
      {done && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600 p-6 text-white animate-in fade-in duration-300">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white text-emerald-600 shadow-2xl animate-scale-up">
            <Check className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Task Cleared & Resolved!</h2>
          <p className="mt-2 text-center text-xs font-medium text-emerald-100 max-w-sm">
            Public Map has been updated in real-time. Road block cleared for Case #{hazard.id.slice(0, 8).toUpperCase()}.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-700/60 px-4 py-2 text-xs font-bold text-emerald-100">
            <Clock className="h-4 w-4" />
            Returning to Field Queue…
          </div>
        </div>
      )}
    </PublicShell>
  );
}
