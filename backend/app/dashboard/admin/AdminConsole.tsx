"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  MapPin,
  RefreshCw,
  Route,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
  UserX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge, Button, Card, Chip, Modal, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import type {
  AiSettings,
  BannedReporter,
  HazardRow,
  RetuneLogEntry,
  RoadClosureCorridor,
} from "@/lib/types";

interface AdminConsoleProps {
  initialCorridors: RoadClosureCorridor[];
  initialBanned: BannedReporter[];
  initialFlagged: HazardRow[];
  initialAiSettings: AiSettings;
  initialRetuneLogs: RetuneLogEntry[];
}

export function AdminConsole({
  initialCorridors,
  initialBanned,
  initialFlagged,
  initialAiSettings,
  initialRetuneLogs,
}: AdminConsoleProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "closures" | "moderation" | "ai") || "closures";
  const [activeTab, setActiveTab] = useState<"closures" | "moderation" | "ai">(initialTab);

  // Road Closures State
  const [corridors, setCorridors] = useState<RoadClosureCorridor[]>(initialCorridors);
  const [corridorBusyId, setCorridorBusyId] = useState<string | null>(null);
  const [closureModalCorridor, setClosureModalCorridor] = useState<RoadClosureCorridor | null>(null);
  const [closureReason, setClosureReason] = useState("");

  // Moderation State
  const [banned, setBanned] = useState<BannedReporter[]>(initialBanned);
  const [flagged, setFlagged] = useState<HazardRow[]>(initialFlagged);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [manualBanOpen, setManualBanOpen] = useState(false);
  const [manualReporterId, setManualReporterId] = useState("");
  const [manualDeviceLabel, setManualDeviceLabel] = useState("");
  const [manualReason, setManualReason] = useState("");

  // AI Settings State
  const [aiSettings, setAiSettings] = useState<AiSettings>(initialAiSettings);
  const [confirmSlider, setConfirmSlider] = useState(initialAiSettings.confirm_threshold);
  const [rejectSlider, setRejectSlider] = useState(initialAiSettings.reject_threshold);
  const [retuneLogs, setRetuneLogs] = useState<RetuneLogEntry[]>(initialRetuneLogs);
  const [aiSaveBusy, setAiSaveBusy] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Handlers: Closures ---
  const handleToggleCorridor = async (corridor: RoadClosureCorridor, close: boolean, customReason?: string) => {
    setCorridorBusyId(corridor.id);
    try {
      const res = await fetch("/api/dashboard/admin/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corridor_id: corridor.id,
          action: close ? "CLOSE" : "OPEN",
          reason: customReason || (close ? "Emergency precautionary municipal flood closure" : undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update corridor");

      setCorridors((prev) => prev.map((c) => (c.id === corridor.id ? data.corridor : c)));
      showToast(
        close
          ? `Closed ${corridor.name}. Detour broadcasting live.`
          : `Reopened ${corridor.name}. Evacuation corridor restored.`,
      );
      setClosureModalCorridor(null);
      setClosureReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Closure action failed");
    } finally {
      setCorridorBusyId(null);
    }
  };

  // --- Handlers: Moderation ---
  const handleBanReporter = async (id: string, label: string, reason: string) => {
    setModerationBusyId(id);
    try {
      const res = await fetch("/api/dashboard/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BAN",
          reporter_id: id,
          device_label: label,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ban reporter");

      setBanned((prev) => [data.banned, ...prev.filter((b) => b.id !== id)]);
      setFlagged((prev) => prev.filter((f) => f.id !== id));
      showToast(`Reporter ${id} has been suspended. Subsequent submissions blocked.`, "info");
      setManualBanOpen(false);
      setManualReporterId("");
      setManualDeviceLabel("");
      setManualReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ban failed");
    } finally {
      setModerationBusyId(null);
    }
  };

  const handleUnbanReporter = async (id: string) => {
    setModerationBusyId(id);
    try {
      const res = await fetch("/api/dashboard/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNBAN",
          reporter_id: id,
        }),
      });
      if (!res.ok) throw new Error("Failed to unban reporter");

      setBanned((prev) => prev.filter((b) => b.id !== id));
      showToast(`Reporter ${id} unbanned. Access restored.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unban failed");
    } finally {
      setModerationBusyId(null);
    }
  };

  // --- Handlers: AI Retuning ---
  const handleSaveAiSettings = async () => {
    setAiSaveBusy(true);
    setAiSaveSuccess(false);
    try {
      const res = await fetch("/api/dashboard/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm_threshold: confirmSlider,
          reject_threshold: rejectSlider,
          note: `Manual calibration: Confirm=${confirmSlider.toFixed(2)}, Reject=${rejectSlider.toFixed(2)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save AI calibration");

      setAiSettings(data.settings);
      setRetuneLogs((prev) => [data.log, ...prev]);
      setAiSaveSuccess(true);
      showToast("AI calibration saved. Pipeline thresholds updated live.");
      setTimeout(() => setAiSaveSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update AI settings");
    } finally {
      setAiSaveBusy(false);
    }
  };

  const closedCount = useMemo(() => corridors.filter((c) => c.status === "CLOSED").length, [corridors]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-6 items-center rounded-md bg-purple-50 px-2 font-mono text-[11px] font-extrabold text-purple-700">
                  SYSTEM ADMIN
                </span>
                <span className="text-xs font-bold text-slate-400">·</span>
                <span className="text-xs font-bold text-slate-500">Colombo Municipal Crisis Infrastructure</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                City Operations & Governance
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Manages emergency arterial closures, bans fraudulent reporters, and retunes AI triage sensitivity.
              </p>
            </div>

            {/* Quick Link Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin/weather"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-brand"
              >
                <CloudRain className="h-3.5 w-3.5 text-blue-500" />
                <span>Weather Simulator</span>
              </Link>
              <Link
                href="/dashboard/admin/pipeline"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-purple-600"
              >
                <Cpu className="h-3.5 w-3.5 text-purple-500" />
                <span>Pipeline Trace</span>
              </Link>
              <Link
                href="/dashboard/officer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-brand"
              >
                <span>Officer Desk</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("closures")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition",
                activeTab === "closures"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              <Route className="h-4 w-4" />
              <span>Road Closures Manager</span>
              {closedCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                  {closedCount} Closed
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("moderation")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition",
                activeTab === "moderation"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Banned Reporters & Moderation</span>
              {banned.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                  {banned.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition",
                activeTab === "ai"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              <Sliders className="h-4 w-4" />
              <span>AI Retuning & Confidence Loop</span>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-extrabold text-purple-700">
                {aiSettings.confirm_threshold.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =========================================================================
         * TAB 1: ROAD CLOSURES MANAGER
         * ========================================================================= */}
        {activeTab === "closures" && (
          <div className="space-y-6">
            {/* Top Stat Banner */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <Route className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Monitored Corridors</p>
                  <p className="text-2xl font-extrabold text-slate-900">{corridors.length}</p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-status-crimson">
                  <AlertOctagon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Active Road Blocks</p>
                  <p className="text-2xl font-extrabold text-rose-600">{closedCount}</p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-status-emerald">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Evacuation Safe Corridors</p>
                  <p className="text-2xl font-extrabold text-emerald-600">
                    {corridors.length - closedCount} Clear
                  </p>
                </div>
              </Card>
            </div>

            {/* Public Map Broadcast Notice */}
            <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-brand shrink-0" />
                <p className="text-xs font-medium text-blue-900">
                  <strong className="font-extrabold">Real-time Map Integration:</strong> Toggling corridor closures
                  here immediately updates public evacuation polylines on{" "}
                  <Link href="/map" target="_blank" className="font-bold underline hover:text-brand-indigo">
                    /map
                  </Link>{" "}
                  and shifts routing to high-ground bypass detours.
                </p>
              </div>
              <Link
                href="/map"
                target="_blank"
                className="hidden items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm hover:bg-blue-100 sm:inline-flex"
              >
                <span>Preview Map</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Corridors Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {corridors.map((c) => {
                const isClosed = c.status === "CLOSED";
                const isBusy = corridorBusyId === c.id;

                return (
                  <Card
                    key={c.id}
                    className={cn(
                      "p-6 transition-all",
                      isClosed ? "border-rose-300 bg-rose-50/20 shadow-sm" : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                              isClosed
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200",
                            )}
                          >
                            {isClosed ? "CLOSED · DETOUR ACTIVE" : "OPEN · PASSABLE"}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">·</span>
                          <span className="text-xs font-bold text-slate-600">{wardShort(c.ward_id)}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">{c.name}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">{c.description}</p>
                      </div>

                      {/* Action Toggle */}
                      <div>
                        {isClosed ? (
                          <Button
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() => handleToggleCorridor(c, false)}
                            className="border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>{isBusy ? "Opening..." : "Reopen"}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            disabled={isBusy}
                            onClick={() => {
                              setClosureModalCorridor(c);
                              setClosureReason("Severe water pooling / high river overflow hazard");
                            }}
                            className="px-3 py-1.5 text-xs"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>{isBusy ? "Closing..." : "Close Road"}</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Detour & Status Note */}
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
                      <div className="flex items-start gap-2 text-slate-600">
                        <Route className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Bypass Corridor:</span>{" "}
                          <span>{c.detour_suggestion}</span>
                        </div>
                      </div>
                      {c.reason && (
                        <div className="mt-2 text-slate-500 text-[11px] border-t border-slate-200/60 pt-2">
                          <strong className="text-rose-700 font-bold">Closure Reason:</strong> {c.reason}
                          {c.closed_at && ` (enacted ${timeAgo(c.closed_at)})`}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB 2: BANNED REPORTERS & MODERATION
         * ========================================================================= */}
        {activeTab === "moderation" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">False Reporter Governance</h2>
                <p className="text-xs text-slate-500">
                  Suspended accounts are blocked at the API gateway from filing fraudulent hazard reports.
                </p>
              </div>

              <Button className="px-3 py-1.5 text-xs" onClick={() => setManualBanOpen(true)}>
                <UserX className="h-3.5 w-3.5" />
                <span>Manual Ban Device</span>
              </Button>
            </div>

            {/* Banned Devices Table */}
            <Card className="overflow-hidden border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-rose-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Currently Suspended Reporters ({banned.length})
                  </h3>
                </div>
              </div>

              {banned.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No devices currently banned. System clean.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {banned.map((b) => (
                    <div key={b.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900">{b.id}</span>
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            BLOCKED
                          </span>
                          {b.ip_address && (
                            <span className="font-mono text-[11px] text-slate-400">IP: {b.ip_address}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-700">
                          <strong className="text-slate-900">Device:</strong> {b.device_label}
                        </p>
                        <p className="text-xs text-slate-500">{b.reason}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Suspended {timeAgo(b.banned_at)} · {b.flagged_reports_count} hoax/spam reports intercepted
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        disabled={moderationBusyId === b.id}
                        onClick={() => handleUnbanReporter(b.id)}
                        className="self-start sm:self-auto px-3 py-1.5 text-xs"
                      >
                        <Unlock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{moderationBusyId === b.id ? "Lifting..." : "Lift Ban"}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Flagged Suspect Submissions Queue */}
            <Card className="overflow-hidden border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Flagged Inconclusive / Suspect Reports ({flagged.length})
                  </h3>
                </div>
              </div>

              {flagged.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No suspect or low-confidence submissions in queue.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {flagged.map((f) => (
                    <div key={f.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900">
                            #{f.id.slice(0, 8).toUpperCase()}
                          </span>
                          <StatusBadge status={f.status} />
                          <span className="text-xs font-bold text-slate-500">{wardShort(f.ward_id)}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            Conf: {f.confidence_score.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-slate-900">{categoryLabel(f.category)}</p>
                        <p className="text-xs text-slate-600">
                          {f.description || "(No description provided by citizen)"}
                        </p>
                        {f.trace?.checks?.image_verified === false && (
                          <p className="text-[11px] font-semibold text-rose-600">
                            ⚠️ Image AI rejected: photo did not match hazard category or was indoor/stock photo.
                          </p>
                        )}
                      </div>

                      <Button
                        variant="danger"
                        disabled={moderationBusyId === f.id}
                        onClick={() => {
                          const repId =
                            ((f.trace as Record<string, unknown> | null)?.reporter_id as string) ||
                            f.id;
                          handleBanReporter(
                            repId,
                            `Reporter for Incident #${f.id.slice(0, 8)}`,
                            `Submitted fraudulent report #${f.id.slice(0, 8)}: ${f.description || "Image rejected by AI"}`,
                          );
                        }}
                        className="self-start sm:self-auto px-3 py-1.5 text-xs"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Ban Reporter Device</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================================================
         * TAB 3: AI RETUNING & CONFIDENCE LOOP
         * ========================================================================= */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Sliders Calibration Panel */}
              <Card className="p-6 lg:col-span-2">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Pipeline Threshold Calibration</h2>
                      <p className="text-xs text-slate-500">
                        Controls automated gatekeeping: what auto-publishes vs holds for officer triage.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-md bg-purple-100 px-2.5 py-1 font-mono text-xs font-extrabold text-purple-800">
                    Live Setting
                  </span>
                </div>

                <div className="space-y-8">
                  {/* Confirm Threshold */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-extrabold text-slate-900">
                          Auto-Publish Confirmation Threshold
                        </label>
                        <p className="text-xs text-slate-500">
                          Confidence score required for a hazard to immediately pin as PUBLISHED without human review.
                        </p>
                      </div>
                      <span className="font-mono text-xl font-extrabold text-brand">
                        {confirmSlider.toFixed(2)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.45"
                      max="0.85"
                      step="0.01"
                      value={confirmSlider}
                      onChange={(e) => setConfirmSlider(parseFloat(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand"
                    />

                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>0.45 (More Permissive / High Sensitivity)</span>
                      <span>0.65 (Balanced Standard)</span>
                      <span>0.85 (Strict Verification)</span>
                    </div>
                  </div>

                  {/* Reject Threshold */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-extrabold text-slate-900">
                          Rejection Gate Threshold
                        </label>
                        <p className="text-xs text-slate-500">
                          Confidence below this score marks report as NEED_INFO or rejects as noise/unverified.
                        </p>
                      </div>
                      <span className="font-mono text-xl font-extrabold text-rose-600">
                        {rejectSlider.toFixed(2)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.15"
                      max="0.45"
                      step="0.01"
                      value={rejectSlider}
                      onChange={(e) => setRejectSlider(parseFloat(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-rose-600"
                    />

                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>0.15 (Permit Partial Signals)</span>
                      <span>0.30 (Standard Cutoff)</span>
                      <span>0.45 (Aggressive Rejection)</span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <Button onClick={handleSaveAiSettings} disabled={aiSaveBusy}>
                      <Settings2 className="h-4 w-4" />
                      <span>{aiSaveBusy ? "Saving Calibration..." : "Save & Retune Pipeline"}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirmSlider(0.65);
                        setRejectSlider(0.30);
                      }}
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Loop Explanation Card */}
              <Card className="p-6 bg-purple-50/40 border-purple-200 space-y-4">
                <div className="flex items-center gap-2 text-purple-800">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Closed-Loop Adaptive Tuning
                  </h3>
                </div>

                <p className="text-xs font-medium leading-relaxed text-purple-900">
                  Per the <strong>CodeArena'26 Reference Flow</strong>, the platform features an active feedback loop:
                </p>

                <div className="space-y-2 rounded-xl bg-white p-3.5 text-xs text-slate-700 shadow-sm border border-purple-100">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">1.</span>
                    <span>When officers <strong>confirm</strong> reports, sensitivity nudges +0.02 to capture similar incidents.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">2.</span>
                    <span>When officers <strong>reject</strong> false alarms, the bar raises +0.02 to prevent repeated hoaxes.</span>
                  </div>
                </div>

                <div className="rounded-xl border border-purple-200/80 bg-purple-100/40 p-3 text-[11px] text-purple-800">
                  <strong>Current Model:</strong> Gemini 3.5 Flash Lite + Deterministic PostGIS Spatial Corroboration.
                </div>
              </Card>
            </div>

            {/* Retune Audit History */}
            <Card className="overflow-hidden border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Retune Audit Trail ({retuneLogs.length} events recorded)
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {retuneLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                            log.trigger === "OFFICER_OVERRIDE"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200",
                          )}
                        >
                          {log.trigger.replace("_", " ")}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-medium">{timeAgo(log.timestamp)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{log.note}</p>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg shrink-0">
                      <span>{log.previous_confirm.toFixed(2)}</span>
                      <span>→</span>
                      <span className="text-brand font-extrabold">{log.new_confirm.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Manual Closure Modal */}
      {closureModalCorridor && (
        <Modal open={Boolean(closureModalCorridor)} onClose={() => setClosureModalCorridor(null)}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Declare Emergency Road Closure</h3>
              <button
                onClick={() => setClosureModalCorridor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are declaring an emergency municipal closure for{" "}
              <strong>{closureModalCorridor.name}</strong>. This will be published to the public map and activate
              safe detour routes.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700">Official Municipal Reason</label>
              <textarea
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setClosureModalCorridor(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleToggleCorridor(closureModalCorridor, true, closureReason)}
              >
                Enact Road Closure
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Ban Modal */}
      {manualBanOpen && (
        <Modal open={manualBanOpen} onClose={() => setManualBanOpen(false)}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Ban Reporter Device</h3>
              <button onClick={() => setManualBanOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Reporter Identifier / Device Hash</label>
                <input
                  type="text"
                  placeholder="e.g. rep-user-98a2"
                  value={manualReporterId}
                  onChange={(e) => setManualReporterId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Device Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chrome on Windows / Pixel 7"
                  value={manualDeviceLabel}
                  onChange={(e) => setManualDeviceLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Reason for Suspension</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Repeated hoax submissions with fake pictures"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setManualBanOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!manualReporterId.trim()}
                onClick={() => handleBanReporter(manualReporterId.trim(), manualDeviceLabel, manualReason)}
              >
                Ban Device
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
