"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  LifeBuoy,
  MapPin,
  Package,
  Phone,
  Radio,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ReliefMap } from "./ReliefMap";
import { Badge, Button, Card, Chip, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { timeAgo, wardName, wardShort } from "@/lib/format";
import { attachShelterCoords, type ShelterWithCoords } from "@/lib/safe-routes";
import type { HazardRow, ShelterRow, SuppliesStatus, WardId, WardRow } from "@/lib/types";
import { mapHazardRow, mapShelterRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/use-live";

type ShelterOption = ShelterRow & { free: number };

const SUPPLY_TONE: Record<SuppliesStatus, string> = {
  ADEQUATE: "text-status-emerald",
  LOW: "text-status-amber",
  CRITICAL: "text-status-crimson",
};

const SUPPLY_OPTIONS: SuppliesStatus[] = ["ADEQUATE", "LOW", "CRITICAL"];

// Rich operational metadata for municipal relief shelters in Colombo
const SHELTER_META: Record<
  string,
  {
    coordinator: string;
    phone: string;
    address: string;
    supplies: { name: string; icon: string; status: "good" | "low" | "critical" }[];
  }
> = {
  "Kelaniya Temple Hall": {
    coordinator: "Ven. Sarananda Thero",
    phone: "+94 11 291 1422",
    address: "Peliyagoda Road, Kelaniya (Kelani River Basin)",
    supplies: [
      { name: "Drinking Water", icon: "💧", status: "low" },
      { name: "Dry Rations", icon: "🍞", status: "good" },
      { name: "First Aid", icon: "🩹", status: "good" },
      { name: "Blankets", icon: "🛏️", status: "low" },
    ],
  },
  "Peliyagoda Community Centre": {
    coordinator: "Mr. D. Wickramasinghe",
    phone: "+94 11 293 0511",
    address: "Nagalagam Street Access Point, Peliyagoda",
    supplies: [
      { name: "Drinking Water", icon: "💧", status: "good" },
      { name: "Dry Rations", icon: "🍞", status: "good" },
      { name: "First Aid", icon: "🩹", status: "good" },
      { name: "Power Generator", icon: "⚡", status: "good" },
    ],
  },
  "Town Hall Relief Bay": {
    coordinator: "Officer K. Perera",
    phone: "+94 11 268 4211",
    address: "Viharamahadevi Park Grounds, Colombo 07",
    supplies: [
      { name: "Drinking Water", icon: "💧", status: "good" },
      { name: "Hot Meals", icon: "🍲", status: "good" },
      { name: "Medical Tent", icon: "🏥", status: "good" },
      { name: "Baby Supplies", icon: "🍼", status: "good" },
    ],
  },
  "Thimbirigasyaya School": {
    coordinator: "Principal M. Jayasuriya",
    phone: "+94 11 258 7320",
    address: "Havelock Road, Thimbirigasyaya",
    supplies: [
      { name: "Drinking Water", icon: "💧", status: "critical" },
      { name: "Medical Kits", icon: "💊", status: "critical" },
      { name: "Dry Rations", icon: "🍞", status: "low" },
      { name: "Mats & Bedding", icon: "🛏️", status: "critical" },
    ],
  },
  "Fort Railway Waiting Hall": {
    coordinator: "Station Master S. Alwis",
    phone: "+94 11 243 4215",
    address: "Olcott Mawatha, Colombo Fort",
    supplies: [
      { name: "Drinking Water", icon: "💧", status: "good" },
      { name: "Dry Rations", icon: "🍞", status: "good" },
      { name: "Sanitation Kits", icon: "🧼", status: "good" },
      { name: "Emergency Radio", icon: "📻", status: "good" },
    ],
  },
};

const DEFAULT_META = {
  coordinator: "Relief Coordinator on Duty",
  phone: "+94 11 243 4215",
  address: "Colombo Municipal Operations Area",
  supplies: [
    { name: "Drinking Water", icon: "💧", status: "good" as const },
    { name: "Dry Rations", icon: "🍞", status: "good" as const },
    { name: "First Aid", icon: "🩹", status: "good" as const },
    { name: "Blankets", icon: "🛏️", status: "good" as const },
  ],
};

function uniqueShelters(rows: ShelterRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.ward_id}:${row.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ReliefBoard({
  initialHazards,
  initialShelters,
  initialWards = [],
}: {
  initialHazards: HazardRow[];
  initialShelters: ShelterRow[];
  initialWards?: WardRow[];
}) {
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filter state
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "SUPPLIES" | "CAPACITY" | WardId>("ALL");
  const [focusedCoords, setFocusedCoords] = useState<[number, number] | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);

  // Walk-in modal state
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkinShelterId, setWalkinShelterId] = useState<string>("");
  const [walkinCount, setWalkinCount] = useState(2);

  const { rows: hazards, live, updatedAt } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: initialHazards,
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const { rows: liveShelters } = useLiveRows<ShelterRow>({
    table: "shelters",
    initial: initialShelters,
    mapRow: mapShelterRow,
    fallbackFetch: () => fetch("/api/shelters").then((res) => res.json() as Promise<ShelterRow[]>),
  });

  const { rows: wards } = useLiveRows<WardRow>({
    table: "wards",
    initial: initialWards,
    mapRow: mapWardRow,
    sort: sortWards,
    fallbackFetch: () => fetch("/api/wards").then((res) => res.json() as Promise<WardRow[]>),
  });

  const rawShelters = useMemo(() => uniqueShelters(liveShelters), [liveShelters]);
  const sheltersWithCoords = useMemo(() => attachShelterCoords(rawShelters), [rawShelters]);

  const requests = useMemo(
    () => hazards.filter((row) => row.category === "HELP_REQUEST" && row.status !== "RESOLVED"),
    [hazards],
  );

  // Smart matching: analyzes citizen text/summary for medical, infant, or power needs, scoring shelters with matching supplies
  const matches = useMemo(() => {
    return requests.map((request) => {
      const allOptions = sheltersWithCoords.map((shelter) => ({
        ...shelter,
        free: shelter.total_beds - shelter.occupied_beds,
      }));

      const text = `${request.description || ""} ${request.summary || ""}`.toLowerCase();
      const needsBaby = /(baby|infant|child|milk|diaper)/.test(text);
      const needsMedical = /(medic|doctor|injur|insulin|sick|patient|wound)/.test(text);
      const needsPower = /(power|electr|generator|charge|oxygen)/.test(text);

      const scoreShelter = (s: (typeof allOptions)[number]) => {
        let score = s.free;
        const meta = SHELTER_META[s.name];
        if (meta) {
          const supplyNames = meta.supplies.map((item) => item.name.toLowerCase());
          if (needsBaby && supplyNames.some((n) => n.includes("baby"))) score += 50;
          if (needsMedical && supplyNames.some((n) => n.includes("medical") || n.includes("first aid"))) score += 40;
          if (needsPower && supplyNames.some((n) => n.includes("generator"))) score += 30;
        }
        return score;
      };

      const primary = allOptions
        .filter((shelter) => shelter.ward_id === request.ward_id)
        .sort((a, b) => scoreShelter(b) - scoreShelter(a));

      const overflow = allOptions
        .filter((shelter) => shelter.ward_id !== request.ward_id && shelter.free > 0)
        .sort((a, b) => scoreShelter(b) - scoreShelter(a));

      const identifiedNeeds = [
        needsBaby ? "Infant Care" : null,
        needsMedical ? "Medical Care" : null,
        needsPower ? "Generator/Power" : null,
      ].filter(Boolean) as string[];

      return { request, primary, overflow, identifiedNeeds };
    });
  }, [requests, sheltersWithCoords]);

  // Aggregate logistics metrics
  const totalBeds = rawShelters.reduce((sum, s) => sum + s.total_beds, 0);
  const totalOccupied = rawShelters.reduce((sum, s) => sum + s.occupied_beds, 0);
  const freeBeds = totalBeds - totalOccupied;
  const overallOccupancyPct = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  const supplyWatchCount = rawShelters.filter((s) => s.supplies_status !== "ADEQUATE").length;

  // Filtered shelter list
  const filteredShelters = useMemo(() => {
    return sheltersWithCoords.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        wardName(s.ward_id).toLowerCase().includes(query.toLowerCase()) ||
        (SHELTER_META[s.name]?.coordinator || "").toLowerCase().includes(query.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "SUPPLIES") return s.supplies_status !== "ADEQUATE";
      if (filter === "CAPACITY") {
        const occ = s.total_beds > 0 ? s.occupied_beds / s.total_beds : 0;
        return occ >= 0.7;
      }
      if (filter.startsWith("ward_")) return s.ward_id === filter;

      return true;
    });
  }, [sheltersWithCoords, query, filter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function assign(incident_id: string, shelter_id: string, beds: number) {
    const key = `${incident_id}:${shelter_id}`;
    setBusyKey(key);
    setError("");
    try {
      const response = await fetch("/api/relief/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id, shelter_id, beds }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Assign failed");
      showToast(`Successfully assigned ${beds} bed${beds > 1 ? "s" : ""} to shelter.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusyKey("");
    }
  }

  async function updateShelter(shelter_id: string, occupied_beds: number, supplies_status: SuppliesStatus) {
    setBusyKey(`edit:${shelter_id}`);
    setError("");
    try {
      const response = await fetch("/api/shelters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelter_id, occupied_beds, supplies_status }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Update failed");
      showToast("Shelter logistics updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey("");
    }
  }

  // Handle direct walk-in registration
  async function handleWalkin() {
    if (!walkinShelterId || walkinCount <= 0) return;
    const target = rawShelters.find((s) => s.id === walkinShelterId);
    if (!target) return;
    const newOccupied = Math.min(target.total_beds, target.occupied_beds + walkinCount);
    await updateShelter(target.id, newOccupied, target.supplies_status);
    setWalkinOpen(false);
    showToast(`Registered ${walkinCount} walk-in evacuees at ${target.name}`);
  }

  function handleFocusShelter(shelter: ShelterWithCoords) {
    setSelectedShelterId(shelter.id);
    setFocusedCoords([shelter.lat, shelter.lng]);
  }

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
      {/* Toast Notification */}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-sm font-bold text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      ) : null}

      {/* Header & Desk Meta */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
              Disaster Response · Shelter Logistics Cockpit
            </p>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Emergency Shelter Operations
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Real-time bed allocation, supply replenishment, and municipal evacuation coordination.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-start">
          <button
            type="button"
            onClick={() => setWalkinOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Walk-in Intake</span>
          </button>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right shadow-xs">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Clock className="h-3 w-3" />
              <span>{live ? "Live Stream" : "Syncing"}</span>
            </div>
            <p className="font-mono text-xs font-extrabold text-slate-700">{updatedAt.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Metrics Row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard
          label="Open Evacuation Requests"
          value={requests.length}
          tone={requests.length > 0 ? "amber" : "emerald"}
        />
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Free Beds</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{freeBeds}</span>
            <span className="text-xs font-bold text-slate-400">/ {totalBeds} total</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - overallOccupancyPct)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Capacity Used</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "text-3xl font-black",
                overallOccupancyPct > 85
                  ? "text-rose-600"
                  : overallOccupancyPct > 70
                    ? "text-amber-500"
                    : "text-slate-800",
              )}
            >
              {overallOccupancyPct}%
            </span>
            <span className="text-xs font-bold text-slate-400">{totalOccupied} filled</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-slate-400">
            {overallOccupancyPct > 80 ? "⚠️ High Ward Occupancy" : "🟢 Adequate Capacity"}
          </p>
        </div>
        <StatCard
          label="Critical Supplies Watch"
          value={supplyWatchCount}
          tone={supplyWatchCount > 0 ? "crimson" : "emerald"}
        />
      </div>

      {/* Interactive Map & Command Cockpit Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Top: Interactive Relief Map */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Live Geographic Shelter Map
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {sheltersWithCoords.length} Shelters · Colombo Basin
            </span>
          </div>
          <div className="relative isolate h-80 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-xs">
            <ReliefMap
              shelters={sheltersWithCoords}
              selectedShelterId={selectedShelterId}
              onSelectShelter={(id) => {
                setSelectedShelterId(id);
                const found = sheltersWithCoords.find((s) => s.id === id);
                if (found) setFocusedCoords([found.lat, found.lng]);
              }}
              helpRequests={requests}
              focusCoords={focusedCoords}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>

        {/* Right / Top: Active Queue or Operational Readiness Cockpit */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                {requests.length > 0 ? `Evacuation Queue (${requests.length})` : "Operational Readiness"}
              </h2>
            </div>
            {requests.length === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Standby Mode
              </span>
            ) : null}
          </div>

          {requests.length === 0 ? (
            /* Standby Readiness Cockpit replacing the empty box */
            <div className="flex h-80 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs overflow-hidden">
              <div>
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">All Evacuation Requests Handled</h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-600 leading-relaxed">
                      Zero citizen help requests awaiting bed placement. All active municipal shelters are staffed,
                      monitored, and on standby for intake.
                    </p>
                  </div>
                </div>

                {/* Ward Telemetry Breakdown */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Sector Telemetry & Risk Monitor
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {wards.map((ward) => {
                      const wardShelters = rawShelters.filter((s) => s.ward_id === ward.id);
                      const wardFree = wardShelters.reduce((sum, s) => sum + (s.total_beds - s.occupied_beds), 0);
                      return (
                        <div key={ward.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[11px] text-slate-800">{wardShort(ward.id)}</span>
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                ward.status === "CRITICAL"
                                  ? "bg-rose-500"
                                  : ward.status === "WATCH"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500",
                              )}
                            />
                          </div>
                          <div className="mt-2 text-xs font-extrabold text-slate-700">
                            {wardFree} <span className="text-[10px] font-normal text-slate-400">free</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                            <Waves className="h-2.5 w-2.5 text-blue-500" />
                            <span>{ward.river_level_pct}% river</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Logistics Activity Trail */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-bold">
                  <Radio className="h-3 w-3 text-emerald-500 animate-pulse" /> Live Dispatch Radar
                </span>
                <span className="font-medium text-[11px] text-slate-400">Ready for boat & rescue intakes</span>
              </div>
            </div>
          ) : (
            /* Active Matches List */
            <div className="flex h-80 flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
              {matches.map(({ request, primary, overflow, identifiedNeeds }) => (
                <Card key={request.id} className="p-4 border-l-4 border-l-amber-500">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <UrgencyBadge urgency={request.urgency} />
                    <span className="text-xs font-bold text-slate-400">{wardShort(request.ward_id)}</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-400">
                      {timeAgo(request.created_at)}
                    </span>
                  </div>
                  {request.summary ? (
                    <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                        AI Needs Brief
                      </span>
                      <p className="mt-0.5 text-xs font-bold text-slate-800 leading-snug">{request.summary}</p>
                    </div>
                  ) : (
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {request.description || "Evacuation & shelter assistance requested"}
                    </h3>
                  )}

                  {identifiedNeeds && identifiedNeeds.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {identifiedNeeds.map((nd) => (
                        <span key={nd} className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                          🎯 {nd} Priority
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-0.5 text-xs text-slate-500">{wardName(request.ward_id)}</p>

                  {/* Primary Ward Options */}
                  <div className="mt-3 flex flex-col gap-2">
                    {primary.length > 0 ? (
                      primary.map((shelter, idx) => (
                        <ShelterAssignOption
                          key={shelter.id}
                          shelter={shelter}
                          recommended={idx === 0}
                          incidentId={request.id}
                          busy={busyKey === `${request.id}:${shelter.id}`}
                          onAssign={(beds) => void assign(request.id, shelter.id, beds)}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        <strong>No local ward shelter available.</strong> See nearest overflow options below.
                      </div>
                    )}

                    {/* Overflow Options when local is limited */}
                    {primary.every((s) => s.free <= 2) && overflow.length > 0 ? (
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                          Recommended Overflow (Adjacent Ward)
                        </span>
                        <div className="mt-1.5 flex flex-col gap-2">
                          {overflow.slice(0, 2).map((shelter) => (
                            <ShelterAssignOption
                              key={`overflow-${shelter.id}`}
                              shelter={shelter}
                              isOverflow
                              incidentId={request.id}
                              busy={busyKey === `${request.id}:${shelter.id}`}
                              onAssign={(beds) => void assign(request.id, shelter.id, beds)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shelter Registry Toolbar: Search & Filters */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Shelter Capacity & Resource Registry</h2>
          <p className="text-xs font-medium text-slate-500">
            Real-time occupancy control, supply alerts, and site coordinator direct dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shelter, ward, or officer…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
              All ({rawShelters.length})
            </Chip>
            <Chip active={filter === "SUPPLIES"} onClick={() => setFilter("SUPPLIES")}>
              Supply Watch ({supplyWatchCount})
            </Chip>
            <Chip active={filter === "CAPACITY"} onClick={() => setFilter("CAPACITY")}>
              Near Capacity
            </Chip>
            <Chip active={filter === "ward_01"} onClick={() => setFilter("ward_01")}>
              Ward 01
            </Chip>
            <Chip active={filter === "ward_02"} onClick={() => setFilter("ward_02")}>
              Ward 02
            </Chip>
          </div>
        </div>
      </div>

      {/* Shelter Registry Cards Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
        {filteredShelters.map((shelter) => (
          <ShelterRegistryCard
            key={`reg-${shelter.id}`}
            shelter={shelter}
            busy={busyKey === `edit:${shelter.id}`}
            onSave={(occupied, supplies) => void updateShelter(shelter.id, occupied, supplies)}
            onFocusMap={() => handleFocusShelter(shelter)}
            onDispatchedSupply={() => showToast(`Emergency supply truck dispatched to ${shelter.name}`)}
          />
        ))}
        {filteredShelters.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
            No shelters match your search or filter criteria.
          </div>
        ) : null}
      </div>

      {/* Walk-in Intake Modal */}
      {walkinOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Walk-in Evacuee Intake</h3>
              </div>
              <button
                type="button"
                onClick={() => setWalkinOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Directly assign arriving evacuees (e.g. boat rescues, neighborhood walk-ins) into a local shelter.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Destination Shelter
                </label>
                <select
                  value={walkinShelterId}
                  onChange={(e) => setWalkinShelterId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select an active shelter…</option>
                  {rawShelters.map((s) => {
                    const free = s.total_beds - s.occupied_beds;
                    return (
                      <option key={s.id} value={s.id} disabled={free <= 0}>
                        {s.name} ({free} free beds · {wardShort(s.ward_id)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Number of Evacuees
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={walkinCount}
                    onChange={(e) => setWalkinCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-sm font-extrabold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 4, 8].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setWalkinCount(num)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl text-xs" onClick={() => setWalkinOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                className="rounded-xl text-xs"
                disabled={!walkinShelterId}
                onClick={handleWalkin}
              >
                Confirm Intake
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

// Option item inside the incident assignment box
function ShelterAssignOption({
  shelter,
  recommended = false,
  isOverflow = false,
  incidentId,
  busy = false,
  onAssign,
}: {
  shelter: ShelterOption;
  recommended?: boolean;
  isOverflow?: boolean;
  incidentId?: string;
  busy?: boolean;
  onAssign?: (beds: number) => void;
}) {
  const [beds, setBeds] = useState(1);
  const used = shelter.total_beds - shelter.free;
  const fill = shelter.total_beds > 0 ? Math.min(100, (used / shelter.total_beds) * 100) : 0;
  const canAssign = Boolean(incidentId && onAssign && shelter.free > 0);

  useEffect(() => {
    setBeds((current) => Math.min(Math.max(1, current), Math.max(1, shelter.free)));
  }, [shelter.free]);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 transition-colors",
        recommended
          ? "border-emerald-500/50 bg-emerald-50/50"
          : isOverflow
            ? "border-indigo-200 bg-indigo-50/30"
            : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <strong className="text-xs font-extrabold text-slate-900">{shelter.name}</strong>
          {recommended ? (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800">
              Best Local Match
            </span>
          ) : isOverflow ? (
            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-indigo-800">
              Safe Overflow
            </span>
          ) : null}
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          <span className="font-extrabold text-emerald-600">{shelter.free}</span> / {shelter.total_beds} free
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full transition-all duration-300"
          style={{
            width: `${fill}%`,
            background: fill > 85 ? "#ef4444" : fill > 70 ? "#f59e0b" : "#10b981",
          }}
        />
      </div>

      {onAssign ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-extrabold uppercase ${SUPPLY_TONE[shelter.supplies_status]}`}>
            Supplies {shelter.supplies_status.toLowerCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={Math.max(1, shelter.free)}
              value={beds}
              disabled={busy || !canAssign}
              onChange={(e) => setBeds(Math.max(1, Number(e.target.value) || 1))}
              className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
              aria-label="Beds to assign"
            />
            <Button
              type="button"
              variant="success"
              className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
              disabled={busy || !canAssign}
              onClick={() => onAssign(beds)}
            >
              {busy ? "Placing…" : "Assign"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Full-featured Shelter Registry Management Card
function ShelterRegistryCard({
  shelter,
  busy,
  onSave,
  onFocusMap,
  onDispatchedSupply,
}: {
  shelter: ShelterWithCoords;
  busy: boolean;
  onSave: (occupied: number, supplies: SuppliesStatus) => void;
  onFocusMap: () => void;
  onDispatchedSupply: () => void;
}) {
  const meta = SHELTER_META[shelter.name] ?? DEFAULT_META;
  const [occupied, setOccupied] = useState(shelter.occupied_beds);
  const [supplies, setSupplies] = useState(shelter.supplies_status);
  const [items, setItems] = useState(meta.supplies);
  const [supplyDispatched, setSupplyDispatched] = useState(false);

  const free = Math.max(0, shelter.total_beds - occupied);
  const fill = shelter.total_beds > 0 ? Math.min(100, (occupied / shelter.total_beds) * 100) : 0;
  const dirty = occupied !== shelter.occupied_beds || supplies !== shelter.supplies_status;

  // Accurately calibrated capacity alert tone
  const capacityTone =
    fill >= 85
      ? { label: "Critical (>85%)", bg: "bg-rose-500", text: "text-rose-600", pill: "bg-rose-50 text-rose-700" }
      : fill >= 70
        ? { label: "Near Full", bg: "bg-amber-500", text: "text-amber-600", pill: "bg-amber-50 text-amber-700" }
        : { label: "Healthy", bg: "bg-emerald-500", text: "text-emerald-600", pill: "bg-emerald-50 text-emerald-700" };

  useEffect(() => {
    setOccupied(shelter.occupied_beds);
    setSupplies(shelter.supplies_status);
  }, [shelter.occupied_beds, shelter.supplies_status]);

  function handleBatchAdjust(delta: number) {
    setOccupied((curr) => Math.max(0, Math.min(shelter.total_beds, curr + delta)));
  }

  function handleToggleItem(index: number) {
    const next = [...items];
    const curr = next[index].status;
    const nextStatus = curr === "good" ? "low" : curr === "low" ? "critical" : "good";
    next[index] = { ...next[index], status: nextStatus };
    setItems(next);

    // Auto-compute overall shelter status based on items
    if (next.some((i) => i.status === "critical")) {
      setSupplies("CRITICAL");
    } else if (next.some((i) => i.status === "low")) {
      setSupplies("LOW");
    } else {
      setSupplies("ADEQUATE");
    }
  }

  function handleSelectStatus(newStatus: SuppliesStatus) {
    setSupplies(newStatus);
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        status: newStatus === "ADEQUATE" ? "good" : newStatus === "LOW" ? "low" : "critical",
      })),
    );
  }

  function handleDispatchSupply() {
    setSupplyDispatched(true);
    onDispatchedSupply();
  }

  function handleRestocked() {
    setSupplies("ADEQUATE");
    setItems((prev) => prev.map((i) => ({ ...i, status: "good" })));
    onSave(occupied, "ADEQUATE");
    setSupplyDispatched(false);
  }

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">{shelter.name}</h3>
              <span className={cn("rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase", capacityTone.pill)}>
                {capacityTone.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {meta.address} · <span className="font-bold text-slate-700">{wardShort(shelter.ward_id)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onFocusMap}
            title="Focus on live map"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <MapPin className="h-4 w-4" />
          </button>
        </div>

        {/* Coordinator Contact */}
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="text-slate-400">👤</span>
            <span>{meta.coordinator}</span>
          </div>
          <a
            href={`tel:${meta.phone.replace(/\s+/g, "")}`}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
          >
            <Phone className="h-3 w-3" />
            <span>{meta.phone}</span>
          </a>
        </div>

        {/* Capacity Meter Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">
              Occupancy: <span className="text-slate-900">{occupied}</span> / {shelter.total_beds} beds
            </span>
            <span className={cn("font-extrabold", capacityTone.text)}>
              {free} Free ({Math.round(fill)}% full)
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full transition-all duration-300", capacityTone.bg)}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        {/* Interactive Supplies Inventory Checklist */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Inventory Checklist (Click item to toggle)
            </span>
            <span className={cn("text-[11px] font-extrabold uppercase", SUPPLY_TONE[supplies])}>
              ● {supplies}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {items.map((item, idx) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleToggleItem(idx)}
                title={`Click to toggle ${item.name} stock`}
                className={cn(
                  "flex items-center justify-between gap-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold transition-all text-left hover:scale-[1.02]",
                  item.status === "critical"
                    ? "border-rose-300 bg-rose-50 text-rose-700 shadow-xs"
                    : item.status === "low"
                      ? "border-amber-300 bg-amber-50 text-amber-700 shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </div>
                <span
                  className={cn(
                    "text-[8px] font-black uppercase px-1 py-0.5 rounded shrink-0",
                    item.status === "critical"
                      ? "bg-rose-200 text-rose-800"
                      : item.status === "low"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Control Bar */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Rapid Bed Intake Stepper */}
          <div className="flex items-center gap-1">
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                className="px-2.5 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={busy || occupied <= 0}
                onClick={() => handleBatchAdjust(-1)}
                title="Decrease 1 bed"
              >
                −1
              </button>
              <input
                type="number"
                min={0}
                max={shelter.total_beds}
                value={occupied}
                disabled={busy}
                onChange={(e) =>
                  setOccupied(Math.max(0, Math.min(shelter.total_beds, Number(e.target.value) || 0)))
                }
                className="w-12 border-x border-slate-200 py-1 text-center font-mono text-xs font-extrabold text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                className="px-2.5 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={busy || occupied >= shelter.total_beds}
                onClick={() => handleBatchAdjust(1)}
                title="Increase 1 bed"
              >
                +1
              </button>
            </div>

            {/* Quick batch buttons for mass intakes */}
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
              onClick={() => handleBatchAdjust(5)}
              disabled={busy || occupied + 5 > shelter.total_beds}
            >
              +5
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
              onClick={() => handleBatchAdjust(10)}
              disabled={busy || occupied + 10 > shelter.total_beds}
            >
              +10
            </button>
          </div>

          {/* Quick 1-Click Supplies Pills & Save */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSelectStatus("ADEQUATE")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition-all",
                  supplies === "ADEQUATE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Adequate
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSelectStatus("LOW")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition-all",
                  supplies === "LOW"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-amber-700 hover:bg-amber-50",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Low
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSelectStatus("CRITICAL")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition-all",
                  supplies === "CRITICAL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-rose-700 hover:bg-rose-50",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Critical
              </button>
            </div>

            <Button
              type="button"
              variant="success"
              className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold shadow-xs"
              disabled={busy || !dirty}
              onClick={() => onSave(occupied, supplies)}
            >
              {busy ? "Saving…" : dirty ? "Save Changes" : "Saved ✓"}
            </Button>
          </div>
        </div>

        {/* Emergency Resupply Action Button if Supplies are LOW or CRITICAL */}
        {supplies !== "ADEQUATE" ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-amber-800">
              <Package className="h-3.5 w-3.5 text-amber-600" />
              {supplies === "CRITICAL" ? "Critical supply shortage reported" : "Restock recommended"}
            </span>
            <div className="flex items-center gap-2">
              {supplyDispatched ? (
                <button
                  type="button"
                  onClick={handleRestocked}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  Mark Restocked (Adequate)
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDispatchSupply}
                disabled={supplyDispatched}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors",
                  supplyDispatched
                    ? "bg-slate-700 text-slate-200 cursor-default"
                    : "bg-amber-600 text-white hover:bg-amber-700 shadow-xs",
                )}
              >
                <Truck className="h-3 w-3" />
                <span>{supplyDispatched ? "Truck Dispatched ✓" : "Dispatch Supplies"}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
