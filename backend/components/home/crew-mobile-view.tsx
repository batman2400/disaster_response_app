"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Construction,
  Database,
  ExternalLink,
  HardHat,
  Loader2,
  MapPin,
  Navigation,
  QrCode,
  Radio,
  Shield,
  Smartphone,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { MuleScannerModal } from "@/components/mule-scanner-modal";
import { getMuleBeacons, syncMuleBeacons } from "@/lib/offline-mule";
import {
  CREW_TEAMS,
  SELECTED_CREW_STORAGE_KEY,
  getCrewTeam,
  isHazardAssignedToCrew,
} from "@/lib/store";
import type { DataMuleBeacon, HazardRow, WardRow } from "@/lib/types";
import { timeAgo, wardShort } from "@/lib/format";

interface CrewMobileViewProps {
  hazards: HazardRow[];
  wards: WardRow[];
}

export function CrewMobileView({ hazards, wards }: CrewMobileViewProps) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<"scan" | "vault">("scan");
  const [vaultBeacons, setVaultBeacons] = useState<DataMuleBeacon[]>([]);
  const [isRelaying, setIsRelaying] = useState(false);
  const [relayToast, setRelayToast] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string>("all");
  const [pickerOpen, setPickerOpen] = useState(false);

  const refreshVault = async () => {
    try {
      const beacons = await getMuleBeacons();
      setVaultBeacons(beacons);
    } catch {
      setVaultBeacons([]);
    }
  };

  useEffect(() => {
    void refreshVault();
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SELECTED_CREW_STORAGE_KEY);
    if (saved && (saved === "all" || getCrewTeam(saved))) {
      setSelectedCrewId(saved);
    }
  }, []);

  const selectCrew = (crewId: string) => {
    setSelectedCrewId(crewId);
    setPickerOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_CREW_STORAGE_KEY, crewId);
    }
  };

  const selectedCrew = selectedCrewId === "all" ? undefined : getCrewTeam(selectedCrewId);
  const deskHref = selectedCrewId === "all" ? "/crew" : `/crew?unit=${selectedCrewId}`;
  const muleCrewId = selectedCrewId !== "all" ? selectedCrewId : "crew_general_01";

  const handleQuickRelay = async () => {
    if (vaultBeacons.length === 0) return;
    setIsRelaying(true);
    try {
      const res = await syncMuleBeacons(muleCrewId);
      if (res.synced > 0) {
        setRelayToast(`Successfully relayed ${res.synced} offline citizen SOS beacon(s) to Municipal Command!`);
        await refreshVault();
        router.refresh();
      } else {
        setRelayToast("Relay failed or no beacons to send. Check cellular connection.");
      }
    } catch {
      setRelayToast("Relay failed. Beacons remain safely stored in local vault.");
    } finally {
      setIsRelaying(false);
      setTimeout(() => setRelayToast(null), 6000);
    }
  };

  const crewLoads = useMemo(
    () =>
      CREW_TEAMS.map((crew) => ({
        ...crew,
        open: hazards.filter((h) => h.status !== "RESOLVED" && isHazardAssignedToCrew(h, crew.id)).length,
        urgent: hazards.filter(
          (h) =>
            h.status !== "RESOLVED" &&
            isHazardAssignedToCrew(h, crew.id) &&
            (h.urgency === "CRITICAL" || h.is_road_blocked),
        ).length,
      })),
    [hazards],
  );

  const unitHazards = useMemo(() => {
    const open = hazards.filter((h) => h.status !== "RESOLVED");
    if (selectedCrewId === "all") return open;
    return open.filter((h) => isHazardAssignedToCrew(h, selectedCrewId));
  }, [hazards, selectedCrewId]);

  const priorityHazards = useMemo(() => {
    const urgent = unitHazards.filter((h) => h.urgency === "CRITICAL" || h.is_road_blocked);
    if (selectedCrewId === "all") return urgent;
    return [...urgent, ...unitHazards.filter((h) => !urgent.includes(h))];
  }, [unitHazards, selectedCrewId]);

  return (
    <div className="flex flex-col gap-5 animate-pop">
      {/* 1. Crew Status & Unit Banner */}
      <div className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <HardHat className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-800">
                  On-Ground Team
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className="mt-1 flex w-full items-center gap-1.5 text-left touch-manipulation"
                aria-expanded={pickerOpen}
                aria-label="Choose field crew unit"
              >
                <h3 className="truncate text-base font-black text-slate-900">
                  {selectedCrew?.name || "All Response Units"}
                </h3>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-cyan-700 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                />
              </button>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {selectedCrew
                  ? `${selectedCrew.station} · ${selectedCrew.specialty}`
                  : "Select a dispatched unit to inspect only that crew's work orders."}
              </p>
            </div>
          </div>

          <Link
            href={deskHref}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-cyan-700 active:scale-95 touch-manipulation"
          >
            <span>Open Desk</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {pickerOpen ? (
          <div className="mt-3 flex flex-col gap-1.5 rounded-2xl border border-cyan-200 bg-white/90 p-2 shadow-sm">
            <button
              type="button"
              onClick={() => selectCrew("all")}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left touch-manipulation ${
                selectedCrewId === "all" ? "bg-cyan-600 text-white" : "hover:bg-cyan-50"
              }`}
            >
              <span className="text-xs font-black">All Response Units</span>
              <span className="text-[10px] font-bold">
                {hazards.filter((h) => h.status !== "RESOLVED").length} open
              </span>
            </button>
            {crewLoads.map((crew) => (
              <button
                key={crew.id}
                type="button"
                onClick={() => selectCrew(crew.id)}
                className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left touch-manipulation ${
                  selectedCrewId === crew.id ? "bg-cyan-600 text-white" : "hover:bg-cyan-50"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {selectedCrewId === crew.id ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    <span className="text-xs font-black">{crew.shortName}</span>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-[10px] font-semibold ${
                      selectedCrewId === crew.id ? "text-cyan-50" : "text-slate-500"
                    }`}
                  >
                    {crew.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-black">{crew.open}</p>
                  <p
                    className={`text-[10px] font-bold ${
                      selectedCrewId === crew.id ? "text-cyan-50" : "text-rose-600"
                    }`}
                  >
                    {crew.urgent} urgent
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-cyan-200/60 pt-3 text-center">
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Assigned</p>
            <p className="text-lg font-black text-slate-900">{unitHazards.length}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase">Urgent</p>
            <p className="text-lg font-black text-rose-600">
              {unitHazards.filter((h) => h.urgency === "CRITICAL" || h.is_road_blocked).length}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-amber-500 uppercase">Roadblocks</p>
            <p className="text-lg font-black text-amber-600">
              {unitHazards.filter((h) => h.is_road_blocked).length}
            </p>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {relayToast && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-extrabold text-emerald-900 shadow-sm animate-pop">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{relayToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setRelayToast(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Rapid Field Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setScannerTab("scan");
            setScannerOpen(true);
          }}
          className="flex flex-col items-start justify-between rounded-3xl border border-indigo-200 bg-white p-4.5 text-left shadow-xs transition-transform hover:border-indigo-500 active:scale-95 touch-manipulation"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <QrCode className="h-5 w-5" />
            </div>
            {vaultBeacons.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-slate-900 animate-pulse">
                {vaultBeacons.length} stored
              </span>
            )}
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-black text-slate-900">Scan SOS Beacon</h4>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Data Mule: harvest citizen offline beacons.
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Launch Scanner</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>

        <Link
          href="/report"
          className="flex flex-col items-start justify-between rounded-3xl border border-amber-200 bg-white p-4.5 text-left shadow-xs transition-transform hover:border-amber-500 active:scale-95 touch-manipulation"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Construction className="h-5 w-5" />
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-black text-slate-900">Log Road Obstacle</h4>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Update impassable routes for safe routing.
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
            <span>Report Debris</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      {/* 2.5 Data Mule Offline Vault & Relay Banner (When beacons exist) */}
      {vaultBeacons.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 p-4.5 shadow-md animate-pop">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-600 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                Data Mule Vault · {vaultBeacons.length} Offline SOS Buffered
              </span>
            </div>
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900">
              Stored Locally
            </span>
          </div>

          <p className="mt-1.5 text-xs font-semibold text-amber-900">
            Citizen emergency distress requests captured in zero-cell zones are buffered safely on this device. When in network range, relay them to Municipal Command.
          </p>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleQuickRelay}
              disabled={isRelaying}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-amber-600/30 hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              {isRelaying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Relaying to Command...</span>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>Relay All ({vaultBeacons.length}) to Command Center</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setScannerTab("vault");
                setScannerOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs font-black text-amber-900 shadow-2xs hover:bg-amber-50"
            >
              <Database className="h-3.5 w-3.5 text-amber-600" />
              <span>Inspect Saved Output ({vaultBeacons.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Priority Dispatch Workorders */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-cyan-600" />
            <h4 className="text-sm font-black text-slate-900">
              {selectedCrew ? `${selectedCrew.shortName} Work Orders` : "Priority Work Orders"}
            </h4>
          </div>
          <Link
            href={deskHref}
            className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
          >
            View All ({unitHazards.length})
          </Link>
        </div>

        {priorityHazards.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            {selectedCrew
              ? `No open tickets assigned to ${selectedCrew.shortName}.`
              : "No critical clearance tickets in this sector."}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {priorityHazards.slice(0, 4).map((h) => (
              <div
                key={h.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 transition-all hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase">
                        {wardShort(h.ward_id)}
                      </span>
                      {h.is_road_blocked ? (
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                          Road Blocked
                        </span>
                      ) : null}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                          h.urgency === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {h.urgency}
                      </span>
                      {h.assigned_crew_name ? (
                        <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800">
                          {getCrewTeam(h.assigned_crew_id || "")?.shortName || h.assigned_crew_name}
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-900">
                      {h.category} - {h.description?.slice(0, 75) || "Active hazard"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    {timeAgo(h.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50">
                  <Link
                    href={`/map?hazard=${h.id}`}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-brand touch-manipulation"
                  >
                    <Navigation className="h-3 w-3 text-blue-500" />
                    <span>Navigate</span>
                  </Link>
                  <Link
                    href={deskHref}
                    className="flex items-center gap-1 rounded-xl bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-cyan-700 touch-manipulation"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Resolve / Photo</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mule Scanner Modal */}
      <MuleScannerModal
        open={scannerOpen}
        initialTab={scannerTab}
        crewId={muleCrewId}
        onClose={() => {
          setScannerOpen(false);
          void refreshVault();
        }}
        onBeaconCaptured={() => {
          void refreshVault();
        }}
        onBeaconsRelayed={(count) => {
          void refreshVault();
          setRelayToast(`Successfully relayed ${count} offline citizen beacon(s) to Municipal Command!`);
          router.refresh();
        }}
      />
    </div>
  );
}
