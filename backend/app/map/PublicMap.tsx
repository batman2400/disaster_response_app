"use client";

import {
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  Camera,
  Check,
  Compass,
  LocateFixed,
  Map as MapIcon,
  PhoneCall,
  Plus,
  Route,
  ShieldAlert,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OfficerMap } from "@/app/dashboard/officer/OfficerMap";
import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Badge, BottomSheet, Button, Chip, StatusBadge } from "@/components/ui";
import { categoryLabel, PIN_COLORS, PIN_LEGEND, pinMeaning, wardShort } from "@/lib/format";
import { LanguageSwitcher } from "@/lib/i18n/language-context";
import {
  attachShelterCoords,
  ARTERIAL_SAFE_CORRIDORS,
  SAFE_ROUTES,
  type SafeCorridor,
  type ShelterWithCoords,
} from "@/lib/safe-routes";
import type { ConfirmResponse, HazardRow, HazardStatus, ShelterRow, WardId, WardRow } from "@/lib/types";
import {
  mapHazardRow,
  mapShelterRow,
  mapWardRow,
  sortHazards,
  sortWards,
  useLiveRows,
} from "@/lib/use-live";

const FILTERS: { id: "ALL" | HazardStatus; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "AREA_ALERT", label: "Alerts" },
  { id: "NEED_INFO", label: "Need info" },
  { id: "PUBLISHED", label: "Published" },
  { id: "RESOLVED", label: "Resolved" },
];

function HazardDetail({
  selected,
  confirmed,
  confirmBusy,
  onConfirm,
}: {
  selected: HazardRow;
  confirmed: boolean;
  confirmBusy: boolean;
  onConfirm: (id: string) => void;
}) {
  return (
    <div className="overflow-y-auto no-scrollbar px-6 pb-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] font-extrabold tracking-wider text-slate-400">
              #{selected.id.slice(0, 8).toUpperCase()}
            </span>
            <StatusBadge status={selected.status} />
          </div>
          {pinMeaning(selected.status) ? (
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{pinMeaning(selected.status)}</p>
          ) : null}
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {categoryLabel(selected.category)}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <LocateFixed className="h-3 w-3" />
            {wardShort(selected.ward_id)}
          </p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-brand-light bg-brand-light/50 px-3 py-1.5">
          <Bot className="mb-0.5 h-3 w-3 text-brand" />
          <span className="font-mono text-sm font-extrabold text-brand">
            {selected.confidence_score.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="relative mb-5 h-40 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
        {selected.photo_url ? (
          <img src={selected.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">No photo</div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-slate-900/60 px-2 py-1 text-[9px] font-bold uppercase text-white backdrop-blur">
          <Camera className="h-3 w-3" /> Citizen Upload
        </div>
      </div>

      {selected.status === "NEED_INFO" ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-slate-800">Needs Verification</h3>
              <p className="mb-3 mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                AI confidence is low. If you are near this location, confirm the hazard is still active.
                {selected.confirmations_count ? ` ${selected.confirmations_count} confirmations so far.` : ""}
              </p>
              <Button
                type="button"
                variant={confirmed ? "primary" : "ghost"}
                disabled={confirmBusy || confirmed}
                className="w-full rounded-xl py-2.5 text-xs"
                onClick={() => onConfirm(selected.id)}
              >
                <Check className="h-3.5 w-3.5" />
                {confirmed ? "Verified (+1)" : confirmBusy ? "Sending…" : "Confirm Active"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-500">
          {selected.description || "No extra notes from the reporter."}
        </p>
      )}
    </div>
  );
}

function ShelterDetail({
  shelter,
  onClose,
}: {
  shelter: ShelterWithCoords;
  onClose: () => void;
}) {
  const suppliesTone =
    shelter.supplies_status === "ADEQUATE"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : shelter.supplies_status === "LOW"
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-rose-50 text-rose-600 border-rose-200";

  return (
    <div className="overflow-y-auto no-scrollbar px-6 pb-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-600">
              MUNICIPAL SHELTER
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${suppliesTone}`}>
              SUPPLIES: {shelter.supplies_status}
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{shelter.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <LocateFixed className="h-3 w-3" />
            {wardShort(shelter.ward_id)}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Beds</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">{shelter.available_beds}</p>
          <p className="text-[10px] font-semibold text-slate-400">of {shelter.total_beds} total</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupancy</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-700">
            {Math.round((shelter.occupied_beds / (shelter.total_beds || 1)) * 100)}%
          </p>
          <p className="text-[10px] font-semibold text-slate-400">{shelter.occupied_beds} occupied</p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href="tel:117"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-xs font-extrabold text-white shadow-md shadow-brand/20 active:scale-98"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Call Disaster Desk for Shelter Intake
        </a>
        <Button variant="ghost" className="w-full text-xs" onClick={onClose}>
          Close Shelter Details
        </Button>
      </div>
    </div>
  );
}

export function PublicMap({
  initialHazards,
  initialWards,
  initialShelters = [],
}: {
  initialHazards: HazardRow[];
  initialWards: WardRow[];
  initialShelters?: ShelterRow[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [sheltersListOpen, setSheltersListOpen] = useState(false);
  const [showEvacRoutes, setShowEvacRoutes] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [corridorsDrawerOpen, setCorridorsDrawerOpen] = useState(false);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);

  const { rows: hazards, live } = useLiveRows<HazardRow>({
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
  const { rows: rawShelters } = useLiveRows<ShelterRow>({
    table: "shelters",
    initial: initialShelters,
    mapRow: mapShelterRow,
    fallbackFetch: () => fetch("/api/shelters").then((res) => res.json() as Promise<ShelterRow[]>),
  });

  const shelters = useMemo(() => attachShelterCoords(rawShelters), [rawShelters]);
  const totalFreeBeds = useMemo(
    () => shelters.reduce((acc, s) => acc + s.available_beds, 0),
    [shelters],
  );

  const visible = useMemo(
    () => hazards.filter((row) => (filter === "ALL" ? true : row.status === filter)),
    [hazards, filter],
  );

  const selectedHazard = hazards.find((row) => row.id === selectedId) ?? null;
  const selectedShelter = shelters.find((s) => s.id === selectedShelterId) ?? null;

  const criticalWard = wards.find((ward) => ward.status === "CRITICAL");
  const areaAlert = hazards.find((row) => row.status === "AREA_ALERT");
  const showAlert = !alertDismissed && Boolean(criticalWard || areaAlert);

  // Active safe evacuation routes to draw
  const activeSafeRoutes = useMemo(() => {
    if (!showEvacRoutes) return [];
    if (selectedCorridorId) {
      const match = ARTERIAL_SAFE_CORRIDORS.find((c) => c.id === selectedCorridorId);
      if (match) return [match.points];
    }
    return ARTERIAL_SAFE_CORRIDORS.map((c) => c.points);
  }, [showEvacRoutes, selectedCorridorId]);

  async function confirm(id: string) {
    setConfirmBusy(true);
    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: id }),
      });
      const payload = (await response.json()) as ConfirmResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Confirm failed");
      setConfirmed(true);
    } finally {
      setConfirmBusy(false);
    }
  }

  function onFocusShelter(shelter: ShelterWithCoords) {
    setSelectedShelterId(shelter.id);
    setSelectedId(null);
    setFocusCoords([shelter.lat, shelter.lng]);
    setSheltersListOpen(false);
  }

  return (
    <PublicShell variant="bleed">
      {/* Officer Map supporting hazards, shelters & safe routes */}
      <OfficerMap
        className="absolute inset-0 z-0 min-h-dvh"
        hazards={visible}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedShelterId(null);
          setConfirmed(false);
        }}
        shelters={shelters}
        selectedShelterId={selectedShelterId}
        onSelectShelter={(s) => {
          setSelectedShelterId(s.id);
          setSelectedId(null);
        }}
        safeRoutes={activeSafeRoutes}
        focusCoords={focusCoords}
      />

      {/* Top Bar with Citizen Switcher & SOS button */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 z-40 flex items-center gap-2 lg:right-auto lg:w-[min(44rem,calc(100vw-24rem))]">
        <Link
          href="/"
          title="Return to Home"
          className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/90 text-slate-700 shadow-soft backdrop-blur-md active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Citizen Navigation Segment: Live Map / Report Hazard */}
        <div className="pointer-events-auto flex h-12 items-center rounded-2xl border border-white/50 bg-white/90 p-1 shadow-soft backdrop-blur-md">
          <div className="flex h-full items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-extrabold text-white shadow-sm">
            <MapIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Live</span> Map
          </div>
          <Link
            href="/report"
            className="flex h-full items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 transition-colors hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" />
            Report
          </Link>
        </div>

        {/* Status ticker */}
        <div className="pointer-events-auto hidden flex-1 items-center gap-2 rounded-2xl border border-white/50 bg-white/90 px-3 py-3 shadow-soft backdrop-blur-md sm:flex">
          <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-status-emerald" />
          </div>
          <p className="truncate text-xs font-extrabold text-slate-800">
            {live ? "Colombo Live Telemetry" : "Connecting…"}
          </p>
        </div>

        {/* Language Switcher & SOS Emergency Hotline Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => setSosModalOpen(true)}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-500 px-3.5 text-xs font-extrabold text-white shadow-lg shadow-rose-500/25 transition-transform active:scale-95"
          >
            <ShieldAlert className="h-4 w-4 animate-pulse" />
            <span>SOS 117</span>
          </button>
        </div>
      </div>

      {/* Emergency Broadcast Announcement Banner */}
      <div className="absolute top-20 left-4 right-4 z-40 lg:right-auto lg:w-[min(44rem,calc(100vw-24rem))] pointer-events-auto">
        <EmergencyBroadcastBanner />
      </div>

      {/* Filter and Layer Action Chips */}
      <div
        className={`absolute left-4 z-40 flex items-center gap-2 overflow-x-auto no-scrollbar lg:max-w-[min(44rem,calc(100vw-24rem))] ${
          showAlert ? "top-64" : "top-32"
        } right-4 lg:right-auto`}
      >
        {/* Find Shelters action chip */}
        <button
          type="button"
          onClick={() => setSheltersListOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white/90 px-3.5 py-2 text-xs font-extrabold text-indigo-700 shadow-soft backdrop-blur-md hover:bg-indigo-50 active:scale-95"
        >
          <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          <span>Shelters ({totalFreeBeds} beds free)</span>
        </button>

        {/* Enhanced Safe Corridors Button with Drawer Link */}
        <div className="inline-flex shrink-0 items-center rounded-2xl border border-emerald-300 bg-white/90 shadow-soft backdrop-blur-md overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setShowEvacRoutes(!showEvacRoutes);
              if (selectedCorridorId) setSelectedCorridorId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold transition-all active:scale-95 ${
              showEvacRoutes
                ? "bg-emerald-500 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Route className="h-3.5 w-3.5" />
            <span>{showEvacRoutes ? "Safe Corridors" : "Corridors Off"}</span>
          </button>
          {showEvacRoutes ? (
            <button
              type="button"
              onClick={() => setCorridorsDrawerOpen(true)}
              className="border-l border-emerald-400 bg-emerald-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-emerald-700"
              title="View designated evacuation corridors list"
            >
              List ({ARTERIAL_SAFE_CORRIDORS.length})
            </button>
          ) : null}
        </div>

        <div className="h-5 w-px shrink-0 bg-slate-200" />

        {FILTERS.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)} className="inline-flex shrink-0 items-center shadow-soft">
            {item.id !== "ALL" ? (
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: PIN_COLORS[item.id] }} />
            ) : null}
            {item.label}
          </Chip>
        ))}
      </div>

      {/* Area Alert Banner */}
      {showAlert ? (
        <div className="absolute top-32 left-4 right-4 z-40 rounded-3xl border border-status-crimson/20 bg-white/90 p-4 shadow-glow-red backdrop-blur-xl animate-slide-down-alert lg:right-auto lg:w-[min(44rem,calc(100vw-24rem))]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-crimson-bg text-status-crimson">
              <TriangleAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">Critical Flood Warning</h3>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-700">Evacuation</span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight text-slate-600">
                {criticalWard
                  ? `High water in ${wardShort(criticalWard.id)} · ${criticalWard.rainfall_mm} mm rain, river ${criticalWard.river_level_pct}%. Follow green evacuation route to Peliyagoda Community Centre.`
                  : "An area alert is active. Avoid low-lying river roads."}
              </p>
            </div>
            <button type="button" onClick={() => setAlertDismissed(true)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Legend */}
      <div
        className={`pointer-events-none absolute z-30 max-w-[17.5rem] rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur-md ${
          selectedHazard || selectedShelter ? "bottom-8 left-4 lg:bottom-8" : "bottom-8 left-4"
        }`}
      >
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Map Legend</p>
        <ul className="flex flex-col gap-1.5">
          {PIN_LEGEND.filter((item) => item.status !== "COUNCIL_TICKET").map((item) => (
            <li key={item.status} className="flex items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIN_COLORS[item.status] }} />
              <p className="text-[11px] font-semibold leading-snug text-slate-600">
                <span className="font-extrabold text-slate-800">{item.label}</span>
                {" — "}
                {item.meaning}
              </p>
            </li>
          ))}
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
            <p className="text-[11px] font-semibold leading-snug text-slate-600">
              <span className="font-extrabold text-slate-800">Shelter</span>
              {" — Relief center"}
            </p>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-0.5 w-3 shrink-0 rounded bg-emerald-500" />
            <p className="text-[11px] font-semibold leading-snug text-slate-600">
              <span className="font-extrabold text-slate-800">Safe Route</span>
              {" — Evacuation corridor"}
            </p>
          </li>
        </ul>
      </div>

      {/* Report FAB */}
      <Link
        href="/report"
        title="Report Hazard"
        className={`absolute bottom-8 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-glow-blue active:scale-90 ${
          selectedHazard || selectedShelter ? "right-6 lg:right-[26rem]" : "right-6"
        }`}
      >
        <Plus className="h-7 w-7" />
      </Link>

      {/* Mobile Bottom Sheets */}
      <div className="lg:hidden">
        <BottomSheet open={Boolean(selectedHazard)} onClose={() => setSelectedId(null)}>
          {selectedHazard ? (
            <HazardDetail
              selected={selectedHazard}
              confirmed={confirmed}
              confirmBusy={confirmBusy}
              onConfirm={(id) => void confirm(id)}
            />
          ) : null}
        </BottomSheet>

        <BottomSheet open={Boolean(selectedShelter)} onClose={() => setSelectedShelterId(null)}>
          {selectedShelter ? (
            <ShelterDetail shelter={selectedShelter} onClose={() => setSelectedShelterId(null)} />
          ) : null}
        </BottomSheet>
      </div>

      {/* Desktop Detail Sidebar */}
      {selectedHazard ? (
        <aside className="absolute top-4 right-4 bottom-4 z-40 hidden w-[24rem] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl lg:flex">
          <div className="flex items-center justify-between px-6 pb-1 pt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Incident</p>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <HazardDetail
            selected={selectedHazard}
            confirmed={confirmed}
            confirmBusy={confirmBusy}
            onConfirm={(id) => void confirm(id)}
          />
        </aside>
      ) : null}

      {selectedShelter ? (
        <aside className="absolute top-4 right-4 bottom-4 z-40 hidden w-[24rem] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl lg:flex">
          <div className="flex items-center justify-between px-6 pb-1 pt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Shelter</p>
            <button
              type="button"
              onClick={() => setSelectedShelterId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ShelterDetail shelter={selectedShelter} onClose={() => setSelectedShelterId(null)} />
        </aside>
      ) : null}

      {/* Emergency Shelters Directory Drawer */}
      <BottomSheet open={sheltersListOpen} onClose={() => setSheltersListOpen(false)}>
        <div className="overflow-y-auto no-scrollbar px-6 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Emergency Shelters</h2>
              <p className="text-xs font-semibold text-slate-500">
                {totalFreeBeds} beds available across {shelters.length} Colombo facilities
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSheltersListOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {shelters.map((shelter) => (
              <div
                key={shelter.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{shelter.name}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{wardShort(shelter.ward_id)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-right">
                    <span className="font-mono text-sm font-extrabold text-emerald-700">{shelter.available_beds}</span>
                    <span className="block text-[9px] font-bold uppercase text-emerald-500">free beds</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Supplies: <strong className="text-slate-600">{shelter.supplies_status}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-xs"
                    onClick={() => onFocusShelter(shelter)}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Locate on Map
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Evacuation Corridors Bottom Sheet */}
      <BottomSheet open={corridorsDrawerOpen} onClose={() => setCorridorsDrawerOpen(false)}>
        <div className="overflow-y-auto no-scrollbar px-6 pb-6 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Safe Evacuation Corridors
                </h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
                  High Ground
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Designated municipal arterial spines cleared of low-lying flood hazards
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCorridorsDrawerOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              {selectedCorridorId ? "1 Corridor Isolated" : "All 4 Corridors Active"}
            </span>
            {selectedCorridorId ? (
              <button
                type="button"
                onClick={() => setSelectedCorridorId(null)}
                className="text-xs font-bold text-brand hover:underline"
              >
                Show All Corridors
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {ARTERIAL_SAFE_CORRIDORS.map((corridor) => {
              const isSelected = selectedCorridorId === corridor.id;
              return (
                <div
                  key={corridor.id}
                  className={`rounded-2xl border p-4 shadow-soft transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">{corridor.name}</h3>
                        {corridor.elevatedHighGround ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-600">
                            Elevated
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-600">{corridor.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-bold text-slate-500">
                      Destination: <strong className="text-emerald-700">{corridor.destinationShelter}</strong>
                    </span>
                    <Button
                      type="button"
                      variant={isSelected ? "primary" : "ghost"}
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setSelectedCorridorId(corridor.id);
                        setFocusCoords(corridor.points[0]);
                        setCorridorsDrawerOpen(false);
                      }}
                    >
                      <Compass className="h-3.5 w-3.5" />
                      {isSelected ? "Active on Map" : "Highlight Corridor"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Emergency SOS Hotlines Modal */}
      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
