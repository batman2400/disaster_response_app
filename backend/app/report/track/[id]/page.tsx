"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Eye,
  Flame,
  HardHat,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  PhoneCall,
  RotateCw,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Truck,
  Users,
  Waves,
  Zap,
} from "lucide-react";

import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Badge, Button, Card, StatusBadge, UrgencyBadge } from "@/components/ui";
import { categoryLabel, timeAgo, wardName, wardShort } from "@/lib/format";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import type { HazardRow } from "@/lib/types";

export default function IncidentTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { lang, t } = useI18n();
  const [hazard, setHazard] = useState<HazardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  const fetchHazard = async () => {
    try {
      const res = await fetch(`/api/hazards/${resolvedParams.id}`, { cache: "no-store" });
      if (res.ok) {
        setHazard((await res.json()) as HazardRow);
        setError("");
        return;
      }
      if (res.status === 404) {
        setError("Incident not found. The report may have been archived or the ID is incorrect.");
        return;
      }
      throw new Error("Could not fetch hazard");
    } catch {
      setError("Failed to connect to municipal hazard registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHazard();
    const interval = setInterval(fetchHazard, 10000);
    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  const copyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <PublicShell>
        <div className="flex h-[70vh] flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand border-t-transparent" />
          <p className="mt-4 text-xs font-bold text-slate-500">Connecting to municipal response registry…</p>
        </div>
      </PublicShell>
    );
  }

  if (error || !hazard) {
    return (
      <PublicShell>
        <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Incident Not Found</h2>
          <p className="mt-2 max-w-md text-xs font-medium text-slate-500">{error}</p>
          <Link href="/report/track" className="mt-6">
            <Button variant="primary">Return to Tracker Search</Button>
          </Link>
        </div>
      </PublicShell>
    );
  }

  const isResolved = hazard.status === "RESOLVED";
  const isHelpRequest = hazard.category === "HELP_REQUEST";
  const assignNote =
    hazard.officer_log?.find((entry) => entry.action === "assign")?.note ||
    (hazard.officer_note?.toLowerCase().includes("assigned to") ? hazard.officer_note : null);
  const isDispatched = Boolean(hazard.dispatched_at || hazard.assigned_crew_name || assignNote);
  const isOfficerApproved = hazard.status === "PUBLISHED" || hazard.status === "AREA_ALERT" || hazard.status === "COUNCIL_TICKET" || isResolved;
  const isAiVerified = Boolean(hazard.confidence_score && hazard.confidence_score > 0);

  return (
    <PublicShell>
      {/* Header Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-1.5 border-b border-white/20 bg-white/85 px-3 py-2.5 sm:px-6 sm:py-3.5 pl-safe pr-safe backdrop-blur-lg lg:px-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/report/track"
            title="Back to search"
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm transition-transform active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-900 truncate">
                #CLM-{hazard.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={hazard.status} />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 truncate">
              {wardShort(hazard.ward_id)} · Reported {timeAgo(hazard.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={copyLink}
            className="flex h-9 sm:h-10 shrink-0 items-center gap-1 sm:gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 sm:px-3.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share Link"}</span>
            <span className="inline sm:hidden">{copied ? "Copied" : "Share"}</span>
          </button>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="px-6 pt-3 lg:px-10">
        <EmergencyBroadcastBanner />
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8 max-w-4xl mx-auto w-full">
        {/* Incident Summary Card */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UrgencyBadge urgency={hazard.urgency} />
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                  {hazard.category.replaceAll("_", " ")}
                </span>
                {hazard.is_road_blocked && (
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                    Road Blocked
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {categoryLabel(hazard.category, lang)}
              </h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {hazard.description || "No extra description provided with report."}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Link href="/map">
                <Button variant="ghost" className="text-xs py-2 px-3 border border-slate-200 bg-white">
                  <MapIcon className="h-3.5 w-3.5" />
                  <span>View on Live Map</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Photos: Reported + Closure if resolved */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
              {hazard.photo_url ? (
                <img src={hazard.photo_url} alt="Reported hazard" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">No Photo</div>
              )}
              <div className="absolute top-2 left-2 rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white backdrop-blur">
                Citizen Evidence Photo
              </div>
            </div>

            {hazard.closure_photo_url ? (
              <div className="relative h-48 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
                <img src={hazard.closure_photo_url} alt="Resolution proof" className="h-full w-full object-cover" />
                <div className="absolute top-2 left-2 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-sm">
                  ✓ Field Resolution Proof
                </div>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                <HardHat className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-600">
                  {isResolved ? "Incident Closed" : "Resolution Photo Pending"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Field crew uploads timestamped photo upon hazard clearance
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 5-Step Live Progress Timeline */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <h2 className="text-base font-black tracking-tight text-slate-900 mb-6">
            Resolution Journey & Audit Timeline
          </h2>

          <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
            {/* Step 1: Submission */}
            <div className="relative flex items-start gap-4">
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">1. Citizen Report Secured</h3>
                  <span className="text-[10px] font-semibold text-slate-400">{timeAgo(hazard.created_at)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Logged in NDRRMS database with GPS coordinates [{hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}].
                </p>
              </div>
            </div>

            {/* Step 2: AI Triage */}
            <div className="relative flex items-start gap-4">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                isAiVerified ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
              }`}>
                {isAiVerified ? <Check className="h-5 w-5 stroke-[3]" /> : <Cpu className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">2. AI Vision & Multimodal Triage</h3>
                  <span className="font-mono text-xs font-extrabold text-brand">
                    {hazard.confidence_score ? `${Math.round(hazard.confidence_score * 100)}% CONF` : "Processed"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Verified category match, basin telemetry, and multi-sensor weather correlation.
                </p>
                {hazard.summary && (
                  <div className="mt-2 rounded-xl bg-blue-50/70 border border-blue-100 p-3 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand block mb-1">
                      AI Operational Brief
                    </span>
                    <p className="font-semibold text-slate-800">{hazard.summary}</p>
                  </div>
                )}
                {hazard.corroborations_count && hazard.corroborations_count > 0 ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-800 border border-amber-200">
                    <Users className="h-3.5 w-3.5 text-amber-600" />
                    <span>Corroborated by {hazard.corroborations_count} nearby citizen reports</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Step 3: Officer Review */}
            <div className="relative flex items-start gap-4">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                isOfficerApproved ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
              }`}>
                {isOfficerApproved ? <Check className="h-5 w-5 stroke-[3]" /> : <Shield className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">3. Municipal Officer Review</h3>
                  <span className="text-[10px] font-bold text-slate-400">CMC Disaster Desk</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isOfficerApproved
                    ? `Approved by active duty officer. Status updated to ${hazard.status}.`
                    : "Awaiting review in Municipal Officer queue."}
                </p>
                {hazard.officer_note && (
                  <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Officer Log Note
                    </span>
                    <p className="font-semibold text-slate-700">{hazard.officer_note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: Crew Dispatch */}
            <div className="relative flex items-start gap-4">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                isDispatched ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
              }`}>
                {isDispatched ? <Check className="h-5 w-5 stroke-[3]" /> : <Truck className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isHelpRequest ? "4. Shelter Placement" : "4. Field Crew Dispatched"}
                  </h3>
                  {hazard.dispatched_at && (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Dispatched {timeAgo(hazard.dispatched_at)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isHelpRequest ? (
                    assignNote ? (
                      <>
                        Relief desk placement: <strong className="text-slate-800">{assignNote}</strong>
                      </>
                    ) : (
                      "Relief desk is matching this request to a shelter with free beds."
                    )
                  ) : isDispatched ? (
                    <>
                      Assigned unit: <strong className="text-slate-800">{hazard.assigned_crew_name || "CMC Disaster Unit"}</strong>. Mobilized for on-site clearing.
                    </>
                  ) : (
                    "Crew assignment in progress by municipal dispatchers."
                  )}
                </p>
              </div>
            </div>

            {/* Step 5: Resolution */}
            <div className="relative flex items-start gap-4">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                isResolved ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
              }`}>
                {isResolved ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">5. Incident Cleared & Resolved</h3>
                  {hazard.resolved_at && (
                    <span className="text-[10px] font-semibold text-emerald-600">{timeAgo(hazard.resolved_at)}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isResolved
                    ? isHelpRequest
                      ? assignNote || "Shelter beds reserved. Proceed to the assigned municipal shelter."
                      : "Hazard cleared by field crews. Road reopened and verified safe for public transit."
                    : isHelpRequest
                      ? "Waiting for the relief desk to reserve beds."
                      : "Resolution pending on-site verification."}
                </p>
                {hazard.resolution_notes && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Resolution note: {hazard.resolution_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
