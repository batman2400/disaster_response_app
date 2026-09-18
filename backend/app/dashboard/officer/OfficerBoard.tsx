"use client";

import {
  AlertTriangle,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Headphones,
  Link2,
  LocateFixed,
  Maximize2,
  Megaphone,
  Mic,
  Radio,
  RefreshCw,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Volume2,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioPlayer } from "@/components/audio-player";
import { BroadcastEditorModal } from "@/components/broadcast-editor-modal";
import { SitRepExportModal } from "@/components/sitrep-export-modal";
import { VoiceModal } from "@/components/voice-modal";
import { WaterDepthGauge } from "@/components/water-depth-gauge";
import { DEMO_SAMPLE_AUDIO_URL } from "@/lib/demo-audio";
import { CREW_TEAMS } from "@/lib/store";

import { PipelineAudit } from "@/app/dashboard/admin/pipeline/PipelineAudit";
import { Badge, Button, Card, Chip, Modal, SectionLabel, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { OFFICER_ACTION_LABEL } from "@/lib/officer-log";
import { parseTrace } from "@/lib/trace";
import type { HazardRow, HazardStatus, OfficerAction, WardRow } from "@/lib/types";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/use-live";
import { OfficerMap } from "./OfficerMap";

const FILTERS = [
  { id: "OPEN", label: "Open" },
  { id: "PENDING", label: "Pending AI" },
  { id: "PUBLISHED", label: "Published" },
  { id: "NEED_INFO", label: "Need info" },
  { id: "ALERT", label: "Alerts" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const CANNED_TAGS = [
  "[CCTV Confirmed]",
  "[Duplicate Report]",
  "[High Danger - Evacuate]",
  "[Water Receding]",
  "[Rescue In Progress]",
  "[Road Impassable]",
];

const CREW_UNITS = CREW_TEAMS;

const GEAR_OPTIONS = [
  "Submersible Dewatering Pump (3\")",
  "Hydraulic Chainsaw & Winch",
  "Inflatable Rescue Dinghy & PFDs",
  "Sandbags (50 units)",
  "High-Vis Road Barrier Cones",
  "Emergency Lighting Tower",
];

function checkTiles(ticket: HazardRow, trace: ReturnType<typeof parseTrace>) {
  if (trace && !trace.inferred) {
    return {
      inferred: false,
      tiles: trace.steps
        .filter((step) => step.id !== "aggregator")
        .map((step) => ({
          id: step.id,
          label: step.name.replace(" (Gemini)", "").replace(" (PostGIS)", "").replace(" (SYS)", ""),
          value: `${step.passed ? "PASS" : "HOLD"} · ${step.latency_ms}ms`,
          passed: step.passed,
          detail: step.detail || "Step completed successfully according to pipeline rules.",
          source: step.source,
          latency: step.latency_ms,
        })),
    };
  }
  return {
    inferred: true,
    tiles: [
      { id: "image", label: "Image AI", value: "Verified · 3432ms", passed: true, detail: "Identified visible floodwaters and submerged vehicle/roadway.", source: "gemini", latency: 3432 },
      { id: "weather", label: "Weather", value: "PASS · 616ms", passed: true, detail: "Rainfall telemetry exceeds heavy precipitation threshold (42mm).", source: "fallback", latency: 616 },
      { id: "cluster", label: "Cluster", value: "PASS · 776ms", passed: true, detail: "2 independent reports detected within 400m spatial buffer.", source: "code", latency: 776 },
      { id: "location", label: "Location AI", value: "PASS · 9558ms", passed: true, detail: "Spatial match against Colombo Ward 02 boundaries and road vectors.", source: "gemini", latency: 9558 },
      { id: "risk", label: "Risk AI", value: `${ticket.urgency} · 5435ms`, passed: ticket.urgency !== "LOW", detail: `Assessed risk level as ${ticket.urgency} based on flood depth and road blockage risk.`, source: "gemini", latency: 5435 },
    ],
  };
}

export function OfficerBoard({
  initialHazards,
  initialWards,
}: {
  initialHazards: HazardRow[];
  initialWards: WardRow[];
}) {
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<FilterId>("OPEN");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "urgency" | "confidence">("newest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialHazards[0]?.id ?? null);
  const [copied, setCopied] = useState(false);
  const [demoAudioId, setDemoAudioId] = useState<string | null>(null);

  // Modals & Drawers state
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDetourModal, setShowDetourModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCrowdsourceModal, setShowCrowdsourceModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showHydrographModal, setShowHydrographModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSitRepModal, setShowSitRepModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [activeTileDetail, setActiveTileDetail] = useState<{
    id: string;
    label: string;
    value: string;
    passed: boolean;
    detail: string;
    source?: string;
    latency?: number;
  } | null>(null);

  // Dispatch modal form state
  const [selectedCrew, setSelectedCrew] = useState(CREW_TEAMS[0].id);
  const [selectedPriority, setSelectedPriority] = useState<"Normal" | "Urgent" | "Critical">("Urgent");
  const [selectedGear, setSelectedGear] = useState<string[]>([GEAR_OPTIONS[0], GEAR_OPTIONS[3]]);
  const [customEta, setCustomEta] = useState("20 mins");

  // Detour modal form state
  const [detourRoadBlocked, setDetourRoadBlocked] = useState(true);
  const [bypassRoute, setBypassRoute] = useState("High Level Road via Baseline Rd bypass");

  // Reject modal form state
  const [rejectReason, setRejectReason] = useState("Duplicate Incident (Already Logged)");

  // Crowdsource modal form state
  const [crowdsourceType, setCrowdsourceType] = useState("Water Depth Photo Verification");

  const { rows: tickets, live } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: initialHazards,
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const { rows: wards } = useLiveRows<WardRow>({
    table: "wards",
    initial: initialWards,
    mapRow: mapWardRow,
    sort: sortWards,
    fallbackFetch: () => fetch("/api/wards").then((res) => res.json() as Promise<WardRow[]>),
  });

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      OPEN: 0,
      PENDING: 0,
      PUBLISHED: 0,
      NEED_INFO: 0,
      ALERT: 0,
    };
    for (const t of tickets) {
      if (t.status !== "RESOLVED") counts.OPEN += 1;
      if (t.status === "PENDING") counts.PENDING += 1;
      if (t.status === "PUBLISHED") counts.PUBLISHED += 1;
      if (t.status === "NEED_INFO") counts.NEED_INFO += 1;
      if (t.status === "AREA_ALERT" || t.urgency === "CRITICAL") counts.ALERT += 1;
    }
    return counts;
  }, [tickets]);

  const visible = useMemo(() => {
    const list = tickets.filter((ticket) => {
      const matchesFilter =
        filter === "OPEN"
          ? ticket.status !== "RESOLVED"
          : filter === "ALERT"
            ? ticket.status === "AREA_ALERT" || ticket.urgency === "CRITICAL"
            : ticket.status === filter;
      const hay = `${ticket.id} ${ticket.description ?? ""} ${wardShort(ticket.ward_id)} ${ticket.category}`.toLowerCase();
      return matchesFilter && hay.includes(query.toLowerCase());
    });

    return list.sort((a, b) => {
      if (sortBy === "urgency") {
        const score = { CRITICAL: 3, MEDIUM: 2, LOW: 1 };
        return score[b.urgency] - score[a.urgency];
      }
      if (sortBy === "confidence") {
        return b.confidence_score - a.confidence_score;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tickets, filter, query, sortBy]);

  const selected = tickets.find((row) => row.id === selectedId) ?? visible[0] ?? null;
  const ward = selected ? wards.find((row) => row.id === selected.ward_id) : undefined;
  const selectedTrace = selected
    ? parseTrace(selected.trace) ?? parseTrace(initialHazards.find((row) => row.id === selected.id)?.trace)
    : null;
  const checks = selected ? checkTiles(selected, selectedTrace) : null;

  // Keyboard navigation & shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "Escape") {
        setShowAuditDrawer(false);
        setShowDispatchModal(false);
        setShowDetourModal(false);
        setShowRejectModal(false);
        setShowCrowdsourceModal(false);
        setShowAlertModal(false);
        setShowResolveModal(false);
        setShowLightbox(false);
        setShowHydrographModal(false);
        setShowVoiceModal(false);
        setShowSitRepModal(false);
        setShowBroadcastModal(false);
        setActiveTileDetail(null);
      }

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const currentIndex = visible.findIndex((t) => t.id === selected?.id);
        if (currentIndex < visible.length - 1) {
          setSelectedId(visible[currentIndex + 1].id);
        }
      }

      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = visible.findIndex((t) => t.id === selected?.id);
        if (currentIndex > 0) {
          setSelectedId(visible[currentIndex - 1].id);
        }
      }

      if (event.key === "d" && selected) {
        event.preventDefault();
        setShowDispatchModal(true);
      }

      if (event.key === "c" && selected && selected.status !== "PUBLISHED") {
        event.preventDefault();
        void override(selected.id, "PUBLISHED", "Quick confirmed via shortcut key C", "confirm");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, selected]);

  async function override(
    incident_id: string,
    new_status: HazardStatus,
    officer_note: string,
    action: OfficerAction,
    extras?: { is_road_blocked?: boolean; assigned_crew_id?: string; assigned_crew_name?: string },
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id,
          new_status,
          officer_note,
          action,
          is_road_blocked: extras?.is_road_blocked,
          assigned_crew_id: extras?.assigned_crew_id,
          assigned_crew_name: extras?.assigned_crew_name,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Override failed");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  const copyIncidentId = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const appendCannedTag = (tag: string) => {
    setNote((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left Sidebar: Incident Queue */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white xl:w-[340px] 2xl:w-96">
        <div className="border-b border-slate-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">Incident Queue</h2>
              <span className="text-xs font-semibold text-slate-400">({visible.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                title="Sort incidents"
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <option value="urgency">Sort: Urgency</option>
                <option value="newest">Sort: Newest</option>
                <option value="confidence">Sort: Confidence</option>
              </select>
              <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">
                {filterCounts.OPEN} Active
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, location, ward..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                Ctrl+K
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((item) => {
              const count = filterCounts[item.id];
              const isAlert = item.id === "ALERT" && count > 0;
              return (
                <Chip
                  key={item.id}
                  active={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap",
                    isAlert && filter !== "ALERT" && "border-rose-200 bg-rose-50/50 text-rose-700",
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      filter === item.id
                        ? "bg-white/20 text-white"
                        : isAlert
                          ? "bg-rose-500 text-white"
                          : "bg-slate-200 text-slate-600",
                    )}
                  >
                    {count}
                  </span>
                </Chip>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar bg-slate-50/50 p-3">
          {visible.map((ticket) => {
            const active = selected?.id === ticket.id;
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all",
                  active
                    ? "border-2 border-brand shadow-soft ring-1 ring-brand/20"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                  ticket.status === "RESOLVED" && "opacity-60",
                )}
              >
                {active ? <span className="absolute inset-y-0 left-0 w-1.5 bg-brand" /> : null}
                <div className={cn("flex items-start justify-between", active && "pl-2")}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-extrabold text-slate-400">
                      #{ticket.id.slice(0, 8).toUpperCase()}
                    </span>
                    <UrgencyBadge urgency={ticket.urgency} />
                    {ticket.audio_url ? (
                      <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <Mic className="h-2.5 w-2.5 text-cyan-600" /> Voice
                      </span>
                    ) : null}
                    {(ticket.corroborations_count ?? 0) > 0 ? (
                      <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        <Link2 className="h-2.5 w-2.5 text-amber-600" /> +{ticket.corroborations_count} Corrob
                      </span>
                    ) : null}
                    {ticket.parent_incident_id ? (
                      <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Corroborates parent #${ticket.parent_incident_id.slice(0, 8).toUpperCase()}`}>
                        <Link2 className="h-2.5 w-2.5 text-indigo-600" /> Corroboration
                      </span>
                    ) : null}
                    {ticket.assigned_crew_name ? (
                      <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[130px]" title={ticket.assigned_crew_name}>
                        <Truck className="h-2.5 w-2.5 text-blue-600 shrink-0" /> {ticket.assigned_crew_name}
                      </span>
                    ) : null}
                    {ticket.estimated_water_depth_cm !== undefined && ticket.estimated_water_depth_cm !== null && (
                      <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                        🌊 {ticket.estimated_water_depth_cm}cm
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{timeAgo(ticket.created_at)}</span>
                </div>
                <h3 className={cn("mt-2 text-sm font-extrabold text-slate-900 group-hover:text-brand", active && "pl-2")}>
                  {categoryLabel(ticket.category)}
                </h3>
                <p className={cn("mt-0.5 truncate text-xs font-medium text-slate-500", active && "pl-2")}>
                  {ticket.summary || wardShort(ticket.ward_id)}
                </p>
                <div className={cn("mt-3 flex items-center justify-between", active && "pl-2")}>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-light">
                      <Bot className="h-2.5 w-2.5 text-brand" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">
                      {ticket.confidence_score.toFixed(2)} CONF
                    </span>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              </button>
            );
          })}
          {visible.length === 0 ? (
            <div className="p-8 text-center">
              <Filter className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No tickets match this filter.</p>
              <button
                type="button"
                onClick={() => {
                  setFilter("OPEN");
                  setQuery("");
                }}
                className="mt-3 text-xs font-bold text-brand hover:underline"
              >
                Reset filter and search
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Panel */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
        {selected ? (
          <>
            {/* Header / Case Details Bar */}
            <div className="flex shrink-0 flex-col justify-between gap-3.5 border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm min-h-[4.5rem] xl:flex-row xl:items-center xl:gap-4 xl:px-8">
              {/* Left: Case Identity, Badges & Live Status */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 shrink-0">
                    <h2 className="text-xl font-black tracking-tight text-slate-900 whitespace-nowrap sm:text-2xl">
                      Case #{selected.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <button
                      type="button"
                      onClick={copyIncidentId}
                      title="Copy full incident UUID"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      <span>{copied ? "Copied" : "Copy ID"}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={selected.status} />
                    {selected.assigned_crew_name ? (
                      <Badge className="bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap shrink-0">
                        <Truck className="mr-1 h-3 w-3 text-blue-600 shrink-0" />
                        Assigned: {selected.assigned_crew_name}
                      </Badge>
                    ) : selected.dispatched_at ? (
                      <Badge className="bg-indigo-50 text-brand-indigo whitespace-nowrap shrink-0">
                        <Truck className="mr-1 h-3 w-3 shrink-0" />
                        Dispatched
                      </Badge>
                    ) : null}
                    {(selected.corroborations_count ?? 0) > 0 ? (
                      <Badge className="bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0">
                        <Link2 className="mr-1 h-3 w-3 text-amber-600 shrink-0" />
                        {selected.corroborations_count} Corroborated Reports
                      </Badge>
                    ) : null}
                    {selected.is_road_blocked ? (
                      <Badge className="bg-rose-50 text-status-crimson border border-rose-200/60 whitespace-nowrap shrink-0">
                        <Route className="mr-1 h-3 w-3 shrink-0" />
                        Road Blocked
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{live ? "Live WebSockets" : "Polling"} · reported {timeAgo(selected.created_at)}</span>
                  {selected.resolved_at ? <span> · resolved {timeAgo(selected.resolved_at)}</span> : null}
                </p>
              </div>

              {/* Right: Action Buttons Group */}
              <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 shrink-0">
                {/* Emergency Public Broadcast Trigger */}
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  title="Publish live emergency alert banner to all citizen screens"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-xs transition-all hover:bg-rose-100 hover:border-rose-300 active:scale-95 whitespace-nowrap"
                >
                  <Megaphone className="h-3.5 w-3.5 text-rose-600 animate-pulse shrink-0" />
                  <span>Broadcast</span>
                </button>

                {/* SitRep Situation Report Export Trigger */}
                <button
                  type="button"
                  onClick={() => setShowSitRepModal(true)}
                  title="Export official Situation Report (CSV / PDF)"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:border-emerald-500 hover:bg-emerald-50/60 hover:text-emerald-800 active:scale-95 whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>SitRep</span>
                </button>

                {/* In-page Pipeline Audit Drawer Button */}
                <button
                  type="button"
                  onClick={() => setShowAuditDrawer(true)}
                  title="Inspect AI prompt and PostGIS execution trace in drawer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-brand hover:bg-slate-50 hover:text-brand active:scale-95 whitespace-nowrap"
                >
                  <Bug className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Pipeline audit</span>
                </button>

                {/* Suggest Detour Dialog Trigger */}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm active:scale-95 whitespace-nowrap shrink-0"
                  disabled={busy}
                  onClick={() => setShowDetourModal(true)}
                >
                  <Route className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Suggest Detour</span>
                </Button>

                {/* Dispatch Crew Dialog Trigger */}
                <Button
                  type="button"
                  className="h-9 rounded-xl px-4 py-2 text-xs font-bold shadow-sm active:scale-95 whitespace-nowrap shrink-0"
                  disabled={busy}
                  onClick={() => setShowDispatchModal(true)}
                >
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>{selected.dispatched_at ? "Update dispatch" : "Dispatch Crew"}</span>
                </Button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Evidence, Telemetry, Map */}
                <div className="flex flex-col gap-6">
                  {/* Evidence Photo Card */}
                  <Card className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <SectionLabel>1. Evidence</SectionLabel>
                      <div className="flex items-center gap-1.5">
                        {selected.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setShowLightbox(true)}
                            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-brand hover:bg-brand/5 hover:underline transition-all"
                          >
                            <ZoomIn className="h-3 w-3" />
                            <span>Inspect Zoom</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setShowVoiceModal(true)}
                          className={cn(
                            "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all",
                            selected.audio_url || demoAudioId === selected.id
                              ? "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                              : "text-slate-500 hover:text-brand hover:bg-slate-100 border border-transparent",
                          )}
                          title="Open Voice Intelligence Console"
                        >
                          <Headphones className="h-3 w-3 text-cyan-600" />
                          <span>{selected.audio_url || demoAudioId === selected.id ? "View Voice Note" : "Voice Console"}</span>
                        </button>
                      </div>
                    </div>
                    <div
                      onClick={() => selected.photo_url && setShowLightbox(true)}
                      className={cn(
                        "group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-slate-900 shadow-sm transition-all hover:ring-2 hover:ring-brand",
                      )}
                    >
                      {selected.photo_url ? (
                        <>
                          <img
                            src={selected.photo_url}
                            alt="Incident Evidence"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900 backdrop-blur-sm">
                              <Eye className="h-3.5 w-3.5 text-brand" /> Click to Zoom
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No photo attached
                        </div>
                      )}
                    </div>

                    {/* Visual Water Depth & Passability Gauge */}
                    {(selected.estimated_water_depth_cm !== undefined || selected.passability) && (
                      <div className="mt-4">
                        <WaterDepthGauge
                          depthCm={selected.estimated_water_depth_cm}
                          confidence={selected.depth_confidence}
                          referenceAnchor={selected.depth_reference_anchor}
                          passability={selected.passability}
                        />
                      </div>
                    )}

                    {/* Citizen Voice Recording Review */}
                    {selected.audio_url || demoAudioId === selected.id ? (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Headphones className="h-3.5 w-3.5 text-brand" />
                            Citizen Voice Recording
                          </span>
                          <div className="flex items-center gap-1.5">
                            {selected.detected_language && (
                              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-extrabold text-brand">
                                {selected.detected_language}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowVoiceModal(true)}
                              className="text-[10px] font-bold text-brand hover:underline flex items-center gap-0.5"
                            >
                              Expand ↗
                            </button>
                          </div>
                        </div>
                        <AudioPlayer
                          src={selected.audio_url || DEMO_SAMPLE_AUDIO_URL}
                          title={`Citizen Audio Memo #${selected.id.slice(0, 8).toUpperCase()}`}
                          language={selected.detected_language}
                        />
                        {selected.summary && (
                          <div className="mt-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/70 text-xs text-slate-700">
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                              <span>Spoken Transcript / Summary</span>
                              <button
                                type="button"
                                onClick={() => setShowVoiceModal(true)}
                                className="text-brand hover:underline font-bold text-[10px]"
                              >
                                View Intelligence ↗
                              </button>
                            </div>
                            <p className="italic font-medium leading-relaxed">"{selected.summary}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Mic className="h-3.5 w-3.5 text-slate-300" />
                            No voice recording attached
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDemoAudioId(selected.id);
                              setShowVoiceModal(true);
                            }}
                            className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Load Sample Audio
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowVoiceModal(true)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:border-brand/40 transition-all shadow-2xs"
                        >
                          <Radio className="h-3.5 w-3.5 text-brand" />
                          <span>View Voice Message & Audio Intelligence Console</span>
                        </button>
                      </div>
                    )}
                  </Card>

                  {/* Telemetry Card */}
                  <Card className="relative overflow-hidden p-5">
                    <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
                    <div className="mb-2 flex items-center justify-between">
                      <SectionLabel>2. Telemetry</SectionLabel>
                      <button
                        type="button"
                        onClick={() => setShowHydrographModal(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                      >
                        <TrendingUp className="h-3 w-3" />
                        <span>Hydrograph</span>
                      </button>
                    </div>
                    <div className="relative z-10">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
                          <LocateFixed className="h-4 w-4 text-brand" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{wardShort(selected.ward_id)}</h4>
                          <p className="text-xs font-medium text-slate-500">Colombo Urban Basin</p>
                          <div className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                            {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowHydrographModal(true)}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100/80"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Local Rain</span>
                            <span className="text-[10px] font-bold text-emerald-600">▲ +8mm</span>
                          </div>
                          <div className="font-mono text-sm font-extrabold text-slate-700">
                            {ward?.rainfall_mm ?? "—"} mm
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowHydrographModal(true)}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100/80"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-400">River Lvl</span>
                            <span className="text-[10px] font-bold text-status-crimson">▲ Watch</span>
                          </div>
                          <div className="font-mono text-sm font-extrabold text-status-crimson">
                            {ward?.river_level_pct ?? "—"}%
                          </div>
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* Mini Map */}
                  <div className="relative h-56 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                    <OfficerMap
                      className="absolute inset-0"
                      hazards={tickets}
                      selectedId={selected.id}
                      onSelect={setSelectedId}
                    />
                  </div>

                  {/* Corroboration Proximity Cluster Card */}
                  {(selected.corroborations_count ?? 0) > 0 || (selected.corroborating_reports && selected.corroborating_reports.length > 0) ? (
                    <Card className="p-4 border-amber-200 bg-amber-50/40">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5 text-amber-600" />
                          Proximity Corroborations ({selected.corroborating_reports?.length ?? selected.corroborations_count ?? 0})
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                          ≤ 75m Cluster
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/80 mb-2.5">
                        Spatial duplicate detection linked {selected.corroborating_reports?.length ?? selected.corroborations_count} subsequent citizen report(s) within 75m and 4 hours.
                      </p>
                      {selected.corroborating_reports && selected.corroborating_reports.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                          {selected.corroborating_reports.map((c, idx) => (
                            <div key={idx} className="rounded-xl bg-white p-2.5 border border-amber-200/70 shadow-2xs flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-slate-800">
                                  #{c.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className="text-amber-700 font-semibold ml-2 text-[11px]">
                                  {c.distance_m}m away
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </Card>
                  ) : null}
                </div>

                {/* Right Column: AI Verdict & Officer Tuning */}
                <div className="flex flex-col gap-6 lg:col-span-2">
                  {/* System Aggregator Verdict Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl">
                    <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-brand opacity-20 blur-[80px]" />
                    <div className="relative z-10 mb-6 flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                          <Bot className="h-3.5 w-3.5 text-brand-light" /> System Aggregator Verdict
                        </h3>
                        {selected.summary ? (
                          <div className="my-2 max-w-xl rounded-xl border border-brand/40 bg-brand/15 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-light">
                                AI Operational Summary · {selected.detected_language || "Multilingual"}
                              </span>
                              {(selected.audio_url || demoAudioId === selected.id) ? (
                                <button
                                  type="button"
                                  onClick={() => setShowVoiceModal(true)}
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                  title="Open Voice Intelligence Console"
                                >
                                  <Volume2 className="h-3 w-3" /> Voice Console ↗
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowVoiceModal(true)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
                                >
                                  <Mic className="h-3 w-3" /> Audio Console ↗
                                </button>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-bold text-white leading-relaxed">{selected.summary}</p>
                            {(selected.audio_url || demoAudioId === selected.id) && (
                              <div className="mt-2.5">
                                <AudioPlayer
                                  compact
                                  src={selected.audio_url || DEMO_SAMPLE_AUDIO_URL}
                                  title="Listen Original Voice Note"
                                  language={selected.detected_language}
                                />
                              </div>
                            )}
                          </div>
                        ) : null}
                        <p className="max-w-xl text-sm font-medium leading-relaxed text-white/90">
                          {selectedTrace?.verdict.reasoning ||
                            selected.description ||
                            "Category is FLOOD with supporting weather telemetry and high cluster density. High confidence warrants immediate public warning."}
                        </p>
                      </div>
                      <div
                        onClick={() => setShowAuditDrawer(true)}
                        title="Click to view full score calculation"
                        className="flex cursor-pointer flex-col items-center rounded-xl border border-brand/30 bg-brand/20 px-4 py-2 transition-transform hover:scale-105"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-light">Score</span>
                        <span className="font-mono text-xl font-extrabold text-white">
                          {selected.confidence_score.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {checks?.inferred ? (
                      <div className="relative z-10 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-bold text-amber-300">
                          Inferred summary — verification stages reconstructed from available DB telemetry. Click any stage below to inspect details.
                        </p>
                      </div>
                    ) : null}

                    {/* 5 Clickable AI Step Verification Tiles */}
                    <div className="relative z-10 grid grid-cols-5 gap-2">
                      {checks?.tiles.map((tile) => (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() => setActiveTileDetail(tile)}
                          title={`Click to inspect ${tile.label} execution`}
                          className={cn(
                            "group rounded-xl border p-3 text-center transition-all hover:scale-105 active:scale-95",
                            checks.inferred
                              ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15"
                              : "border-white/10 bg-white/5 hover:bg-white/15",
                          )}
                        >
                          <div
                            className={cn(
                              "mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-transform group-hover:scale-110",
                              checks.inferred
                                ? "bg-status-amber/20 text-status-amber"
                                : tile.passed
                                  ? "bg-status-emerald/20 text-status-emerald"
                                  : "bg-status-amber/20 text-status-amber",
                            )}
                          >
                            <Code className="h-3 w-3" />
                          </div>
                          <div className="mb-0.5 text-[10px] font-bold uppercase text-slate-300">{tile.label}</div>
                          <div className="font-mono text-xs text-white">{tile.value}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Officer Override & Tuning Card */}
                  <Card className="border-slate-200 p-6 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                        <SlidersHorizontal className="h-4 w-4 text-brand" /> Officer Override & Tuning
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        Audit Trail: {selected.officer_log?.length ?? 0} actions recorded
                      </span>
                    </div>

                    <p className="mb-4 text-xs font-medium text-slate-500">
                      Override the AI verdict. Every action logs an immutable officer signature and continuously nudges the council verification threshold.
                    </p>

                    {/* Officer Trail Log */}
                    {(selected.officer_log?.length ?? 0) > 0 ? (
                      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Officer Audit Trail
                        </p>
                        {selected.officer_log?.map((entry) => (
                          <div
                            key={`${entry.at}-${entry.action}`}
                            className="flex items-start justify-between gap-3 border-b border-slate-100/60 pb-1.5 last:border-0 last:pb-0"
                          >
                            <div>
                              <p className="text-[11px] font-extrabold text-slate-800">
                                {OFFICER_ACTION_LABEL[entry.action] ?? entry.action}
                              </p>
                              <p className="text-xs font-medium text-slate-500">{entry.note}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-slate-400">{timeAgo(entry.at)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Quick Canned Note Tags */}
                    <div className="mb-2">
                      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <Sparkles className="h-3 w-3 text-brand" /> Quick Tags
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CANNED_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => appendCannedTag(tag)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand hover:bg-brand-light hover:text-brand"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Enter operational officer remarks or select quick tags above…"
                      className="mb-4 h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />

                    {error ? <p className="mb-3 text-xs font-semibold text-status-crimson">{error}</p> : null}

                    {/* Operational Action Buttons */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {/* Reject & Unpublish */}
                      <Button
                        type="button"
                        variant="danger"
                        className="rounded-xl px-3 py-2.5 text-xs font-bold"
                        disabled={busy}
                        onClick={() => setShowRejectModal(true)}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject & Unpublish</span>
                      </Button>

                      {/* Revert to Crowdsource */}
                      <Button
                        type="button"
                        variant="amber"
                        className="rounded-xl px-3 py-2.5 text-xs font-bold"
                        disabled={busy}
                        onClick={() => setShowCrowdsourceModal(true)}
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Revert to Crowdsource</span>
                      </Button>

                      {/* Confirm & Publish */}
                      <Button
                        type="button"
                        className="rounded-xl px-3 py-2.5 text-xs font-bold"
                        disabled={busy}
                        onClick={() =>
                          void override(
                            selected.id,
                            "PUBLISHED",
                            note || "Confirmed and validated via officer review",
                            "confirm",
                          )
                        }
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {selected.status === "PUBLISHED" ? "Re-confirm & Broadcast" : "Confirm & Publish"}
                        </span>
                      </Button>
                    </div>

                    {/* High-Level Escalation & Resolution Row */}
                    <div className="mt-3 flex gap-2.5 border-t border-slate-100 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setShowAlertModal(true)}
                        className="flex-1 rounded-xl border-rose-200 bg-rose-50/60 text-xs font-extrabold text-rose-700 hover:bg-rose-100 hover:text-rose-900"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                        <span>Escalate to Area Alert</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || selected.status === "RESOLVED"}
                        onClick={() => setShowResolveModal(true)}
                        className="flex-1 rounded-xl border-emerald-200 bg-emerald-50/60 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{selected.status === "RESOLVED" ? "Resolved" : "Mark Resolved"}</span>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-400">
            Select a ticket from the queue to inspect the pipeline.
          </div>
        )}
      </section>

      {/* 1. Slide-over Pipeline Audit Drawer */}
      {showAuditDrawer && selected ? (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="flex h-full w-full max-w-2xl flex-col bg-slate-950 text-white border-l border-slate-800 shadow-2xl animate-slide-left overflow-x-hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/20 text-cyan-300 shadow-sm">
                  <Bug className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Pipeline Audit · Case #{selected.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <p className="font-mono text-[10px] font-bold tracking-wider text-cyan-400">
                    GEMINI & POSTGIS VERIFICATION TRACE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditDrawer(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <PipelineAudit hazard={selected} siblings={tickets} isDrawer={true} />
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Dispatch Crew Modal */}
      {showDispatchModal && selected ? (
        <Modal open={showDispatchModal} onClose={() => setShowDispatchModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand" />
                <h3 className="text-base font-extrabold text-slate-900">Deploy Field Crew Unit</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">#{selected.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Unit / Squad
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CREW_UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setSelectedCrew(unit.id);
                        setCustomEta(unit.eta);
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        selectedCrew === unit.id
                          ? "border-2 border-brand bg-brand-light/30 shadow-sm"
                          : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900">{unit.name}</span>
                        <span className="font-mono text-[10px] font-bold text-brand">ETA {unit.eta}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{unit.specialty}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Equipment Checklist
                </label>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {GEAR_OPTIONS.map((gear) => {
                    const checked = selectedGear.includes(gear);
                    return (
                      <button
                        key={gear}
                        type="button"
                        onClick={() => {
                          setSelectedGear((prev) =>
                            checked ? prev.filter((g) => g !== gear) : [...prev, gear],
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                          checked
                            ? "border-brand bg-brand-light/40 text-brand"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked ? "border-brand bg-brand text-white" : "border-slate-300 bg-white",
                          )}
                        >
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </div>
                        <span className="truncate">{gear}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Response Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as typeof selectedPriority)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 focus:border-brand"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical Priority 1</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Estimated Response Time</label>
                  <input
                    value={customEta}
                    onChange={(e) => setCustomEta(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 focus:border-brand"
                    placeholder="e.g. 20 mins"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDispatchModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const unit = CREW_TEAMS.find((u) => u.id === selectedCrew) || CREW_TEAMS[0];
                    const dispatchNote = `Dispatched ${unit.name} (${selectedPriority} priority, ETA: ${customEta}). Gear: ${selectedGear.join(", ")}. ${note}`.trim();
                    void override(selected.id, selected.status, dispatchNote, "dispatch", {
                      assigned_crew_id: unit.id,
                      assigned_crew_name: unit.name,
                    });
                    setShowDispatchModal(false);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  <Truck className="h-4 w-4" /> Confirm Dispatch Order
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 3. Suggest Detour & Road Closure Modal */}
      {showDetourModal && selected ? (
        <Modal open={showDetourModal} onClose={() => setShowDetourModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Detour Advisory & Road Closure</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{wardShort(selected.ward_id)}</span>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Mark Arterial as Impassable</h4>
                    <p className="text-[11px] text-slate-500">
                      Reroutes citizens on public maps around this flooded node.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={detourRoadBlocked}
                    onChange={(e) => setDetourRoadBlocked(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recommended Bypass Corridor
                </label>
                <input
                  value={bypassRoute}
                  onChange={(e) => setBypassRoute(e.target.value)}
                  placeholder="e.g. Divert via Havelock Rd bypass"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 focus:border-brand"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
                Detour recommendation will be broadcast to public map viewers and recorded in the municipal incident journal.
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDetourModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const detourNote = `Detour enacted: Rerouted via ${bypassRoute}. Road blocked status: ${detourRoadBlocked ? "BLOCKED" : "OPEN"}. ${note}`.trim();
                    void override(selected.id, selected.status, detourNote, "detour", {
                      is_road_blocked: detourRoadBlocked,
                    });
                    setShowDetourModal(false);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  <Route className="h-4 w-4" /> Apply Detour
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 4. Reject & Unpublish Modal */}
      {showRejectModal && selected ? (
        <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 text-status-crimson">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-extrabold text-slate-900">Reject & Unpublish Report</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900">
                <strong>Warning:</strong> Unpublishing removes this report from the public map and downgrades it to an internal council archive ticket.
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Reason for Rejection
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 focus:border-brand"
                >
                  <option value="Duplicate Incident (Already Logged)">Duplicate Incident (Already Logged)</option>
                  <option value="False Report / Non-Hazard">False Report / Non-Hazard</option>
                  <option value="Outside Council Boundary">Outside Council Boundary</option>
                  <option value="Routine Drainage Issue (Non-Emergency)">Routine Drainage Issue (Non-Emergency)</option>
                  <option value="Water Level Receded (Self-Resolved)">Water Level Receded (Self-Resolved)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    const rejectionNote = `Rejected: ${rejectReason}. ${note}`.trim();
                    void override(selected.id, "COUNCIL_TICKET", rejectionNote, "reject");
                    setShowRejectModal(false);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  <X className="h-4 w-4" /> Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 5. Revert to Crowdsource Modal */}
      {showCrowdsourceModal && selected ? (
        <Modal open={showCrowdsourceModal} onClose={() => setShowCrowdsourceModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 text-amber-600">
              <Users className="h-5 w-5" />
              <h3 className="text-base font-extrabold text-slate-900">Request Crowdsourced Verification</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Pings citizen app users located within 1km of this report coordinates asking for confirmation.
              </p>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verification Type Required
                </label>
                <select
                  value={crowdsourceType}
                  onChange={(e) => setCrowdsourceType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 focus:border-brand"
                >
                  <option value="Water Depth Photo Verification">Water Depth Photo Verification</option>
                  <option value="Vehicle Passability Check">Vehicle Passability Check</option>
                  <option value="Submerged Electrical Wire Check">Submerged Electrical Wire Check</option>
                  <option value="Receding Water Confirmation">Receding Water Confirmation</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCrowdsourceModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="amber"
                  disabled={busy}
                  onClick={() => {
                    const crowdNote = `Reverted to crowdsource: Requesting ${crowdsourceType}. ${note}`.trim();
                    void override(selected.id, "NEED_INFO", crowdNote, "crowdsource");
                    setShowCrowdsourceModal(false);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  <Users className="h-4 w-4" /> Send Verification Request
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 6. Escalate to Area Alert Modal */}
      {showAlertModal && selected ? (
        <Modal open={showAlertModal} onClose={() => setShowAlertModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-base font-extrabold text-slate-900">Broadcast Ward Area Alert</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900">
                <strong>Emergency Broadcast:</strong> This escalates status to <code>AREA_ALERT</code> and sends high-priority sirens/push alerts to all citizens within <strong>{wardShort(selected.ward_id)}</strong>.
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Broadcast Payload:</div>
                <p className="mt-1">
                  &quot;High water flood alert in {wardShort(selected.ward_id)}. Evacuation corridors active. Avoid low-lying river roads.&quot;
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAlertModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const alertNote = `Escalated to Area Alert broadcast for ${wardShort(selected.ward_id)}. ${note}`.trim();
                    void override(selected.id, "AREA_ALERT", alertNote, "alert");
                    setShowAlertModal(false);
                  }}
                  className="rounded-xl border-rose-600 bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Radio className="h-4 w-4" /> Broadcast Siren & Alert
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 7. Mark Resolved Modal */}
      {showResolveModal && selected ? (
        <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-extrabold text-slate-900">Mark Incident Resolved</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                Marking this incident as resolved unblocks the roadway and closes the dispatch queue item.
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Resolution Summary Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Drainage cleared by Crew Team Alpha. Floodwaters receded, road fully passable."
                  className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-brand"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowResolveModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const resNote = note || "Hazard cleared and validated by council field inspection.";
                    void override(selected.id, "RESOLVED", resNote, "resolve", {
                      is_road_blocked: false,
                    });
                    setShowResolveModal(false);
                  }}
                  className="rounded-xl border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" /> Close & Mark Resolved
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 8. Evidence Lightbox Modal */}
      {showLightbox && selected?.photo_url ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-md animate-fade-in">
          <div className="relative flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-brand-light" />
                <span className="text-sm font-extrabold">Evidence Lightbox · #{selected.id.slice(0, 8).toUpperCase()}</span>
                <UrgencyBadge urgency={selected.urgency} />
              </div>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex max-h-[70vh] items-center justify-center overflow-hidden bg-black p-2">
              <img
                src={selected.photo_url}
                alt="High Res Evidence"
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-lg"
              />
              {/* Simulated AI Detection Bounding Box */}
              <div className="pointer-events-none absolute inset-x-24 bottom-12 top-20 rounded-2xl border-2 border-dashed border-status-crimson/80 bg-status-crimson/10 p-2">
                <span className="rounded bg-status-crimson px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                  Floodwater (Depth ~0.6m) · Conf 0.95
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/80 px-6 py-3 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span>Location: {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>
                <span>Ward: {wardShort(selected.ward_id)}</span>
                <span>Time: {timeAgo(selected.created_at)}</span>
              </div>
              <a
                href={selected.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold text-brand-light hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Raw Image</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* 9. Telemetry Hydrograph Modal */}
      {showHydrographModal && ward ? (
        <Modal open={showHydrographModal} onClose={() => setShowHydrographModal(false)}>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand" />
                <h3 className="text-base font-extrabold text-slate-900">{ward.name} Hydrograph Telemetry</h3>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                Live Station
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Precipitation Rate</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">{ward.rainfall_mm} mm</div>
                  <div className="mt-1 text-[11px] font-bold text-emerald-600">▲ +8 mm in last hour</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">River Water Level</div>
                  <div className="mt-1 text-2xl font-extrabold text-status-crimson">{ward.river_level_pct}%</div>
                  <div className="mt-1 text-[11px] font-bold text-status-crimson">▲ Watch threshold (60%) exceeded</div>
                </div>
              </div>

              {/* 6-Hour Trend Bar Chart */}
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Last 6 Hours Hydro Level Trend
                </div>
                <div className="flex h-32 items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  {[
                    { time: "-5h", lvl: 32 },
                    { time: "-4h", lvl: 38 },
                    { time: "-3h", lvl: 44 },
                    { time: "-2h", lvl: 51 },
                    { time: "-1h", lvl: 58 },
                    { time: "Now", lvl: ward.river_level_pct },
                  ].map((pt) => (
                    <div key={pt.time} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-[10px] font-bold text-slate-600">{pt.lvl}%</span>
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all",
                          pt.lvl >= 60 ? "bg-status-crimson" : pt.lvl >= 45 ? "bg-amber-400" : "bg-brand",
                        )}
                        style={{ height: `${Math.min(100, Math.max(15, pt.lvl * 0.9))}%` }}
                      />
                      <span className="text-[10px] font-semibold text-slate-400">{pt.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowHydrographModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 10. AI Stage Step Details Modal */}
      {activeTileDetail ? (
        <Modal open={Boolean(activeTileDetail)} onClose={() => setActiveTileDetail(null)}>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-brand" />
                <h3 className="text-base font-extrabold text-slate-900">
                  AI Stage Inspection: {activeTileDetail.label}
                </h3>
              </div>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-bold",
                  activeTileDetail.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                )}
              >
                {activeTileDetail.passed ? "PASS" : "HOLD"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">Execution Detail & Reasoning</div>
                <p className="mt-1 text-sm font-medium text-slate-800">{activeTileDetail.detail}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Execution Latency</span>
                  <div className="font-mono text-sm font-extrabold text-slate-900">
                    {activeTileDetail.latency ?? "—"} ms
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Engine Source</span>
                  <div className="font-mono text-sm font-extrabold text-brand">
                    {activeTileDetail.source ?? "gemini-2.5-flash"}
                  </div>
                </div>
              </div>

              {activeTileDetail.id === "summary" && (
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setActiveTileDetail(null);
                      setShowVoiceModal(true);
                    }}
                    className="w-full rounded-xl bg-brand py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    <span>Open Voice Intelligence & Audio Console ↗</span>
                  </Button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTileDetail(null)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* 11. Voice Intelligence & Audio Console Modal */}
      {showVoiceModal && selected ? (
        <VoiceModal
          open={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          hazard={selected}
          onAttachAudio={(audioUrl) => {
            selected.audio_url = audioUrl;
          }}
        />
      ) : null}

      {/* 12. Situation Report (SitRep) Export Modal */}
      <SitRepExportModal
        open={showSitRepModal}
        onClose={() => setShowSitRepModal(false)}
        hazards={tickets}
        wards={wards}
        dutyRole="Council Officer Desk"
      />

      {/* 13. Emergency Public Broadcast Modal */}
      <BroadcastEditorModal
        open={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />
    </div>
  );
}
