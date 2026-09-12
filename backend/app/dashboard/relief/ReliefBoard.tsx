"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { wardName, wardShort } from "@/lib/format";
import type { HazardRow, ShelterRow, SuppliesStatus } from "@/lib/types";
import { mapHazardRow, mapShelterRow, sortHazards, useLiveRows } from "@/lib/use-live";

type ShelterOption = ShelterRow & { free: number };

const SUPPLY_TONE: Record<SuppliesStatus, string> = {
  ADEQUATE: "text-status-emerald",
  LOW: "text-status-amber",
  CRITICAL: "text-status-crimson",
};

const SUPPLY_OPTIONS: SuppliesStatus[] = ["ADEQUATE", "LOW", "CRITICAL"];

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
}: {
  initialHazards: HazardRow[];
  initialShelters: ShelterRow[];
}) {
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

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
  const shelters = useMemo(() => uniqueShelters(liveShelters), [liveShelters]);

  const requests = useMemo(
    () => hazards.filter((row) => row.category === "HELP_REQUEST" && row.status !== "RESOLVED"),
    [hazards],
  );
  const matches = useMemo(() => {
    return requests.map((request) => {
      const options = shelters
        .filter((shelter) => shelter.ward_id === request.ward_id)
        .map((shelter) => ({ ...shelter, free: shelter.total_beds - shelter.occupied_beds }))
        .sort((a, b) => b.free - a.free);
      return { request, options };
    });
  }, [requests, shelters]);

  const freeBeds = shelters.reduce((sum, shelter) => sum + (shelter.total_beds - shelter.occupied_beds), 0);
  const tight = shelters.filter((shelter) => shelter.supplies_status !== "ADEQUATE").length;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-status-emerald">Shelter Logistics</p>
      <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Match requests to beds</h2>
      <p className="mt-2 text-sm font-medium text-slate-500">
        Help requests matched to shelters in the same ward, sorted by free beds.
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">
        {live ? "Live" : "Polling"} · last update {updatedAt.toLocaleTimeString()}
      </p>
      {error ? <p className="mt-3 text-sm font-semibold text-status-crimson">{error}</p> : null}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Open requests" value={requests.length} tone="amber" />
        <StatCard label="Free beds" value={freeBeds} tone="emerald" />
        <StatCard label="Supply watch" value={tight} tone="crimson" />
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {matches.length === 0 ? (
          <Card className="p-8 text-center text-sm font-semibold text-slate-400">No open help requests.</Card>
        ) : (
          matches.map(({ request, options }) => (
            <Card key={request.id} className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                <UrgencyBadge urgency={request.urgency} />
                <span className="text-xs font-bold text-slate-400">{wardShort(request.ward_id)}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {request.description || "Help request"}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{wardName(request.ward_id)}</p>
              <div className="mt-4 flex flex-col gap-3">
                {options.length === 0 ? (
                  <p className="text-sm font-semibold text-status-amber">No shelter listed in this ward.</p>
                ) : (
                  options.map((shelter, index) => (
                    <ShelterCard
                      key={shelter.id}
                      shelter={shelter}
                      recommended={index === 0}
                      incidentId={request.id}
                      busy={busyKey === `${request.id}:${shelter.id}`}
                      onAssign={(beds) => void assign(request.id, shelter.id, beds)}
                    />
                  ))
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <h3 className="mt-10 mb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">All shelters</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {shelters.map((shelter) => (
          <ShelterEditor
            key={`all-${shelter.id}`}
            shelter={{ ...shelter, free: shelter.total_beds - shelter.occupied_beds }}
            busy={busyKey === `edit:${shelter.id}`}
            onSave={(occupied, supplies) => void updateShelter(shelter.id, occupied, supplies)}
          />
        ))}
      </div>
    </main>
  );
}

function ShelterCard({
  shelter,
  recommended = false,
  incidentId,
  busy = false,
  onAssign,
}: {
  shelter: ShelterOption;
  recommended?: boolean;
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
        "rounded-2xl border p-4",
        recommended ? "border-status-emerald bg-status-emerald-bg/40" : "border-slate-100 bg-slate-50",
      )}
    >
      <div className="flex items-center justify-between">
        <strong className="text-sm font-extrabold text-slate-900">{shelter.name}</strong>
        {recommended ? (
          <span className="rounded-md bg-status-emerald-bg px-2 py-0.5 text-[10px] font-bold uppercase text-status-emerald">
            Best fit
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-medium text-slate-500">
        {shelter.free} free / {shelter.total_beds} · {wardName(shelter.ward_id)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full"
          style={{ width: `${fill}%`, background: shelter.free < 10 ? "#e11d48" : "#10b981" }}
        />
      </div>
      <p className={`mt-2 text-xs font-bold ${SUPPLY_TONE[shelter.supplies_status]}`}>
        Supplies {shelter.supplies_status.toLowerCase()}
      </p>
      {onAssign ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, shelter.free)}
            value={beds}
            disabled={busy || !canAssign}
            onChange={(event) => setBeds(Math.max(1, Number(event.target.value) || 1))}
            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 focus:border-status-emerald focus:outline-none focus:ring-1 focus:ring-status-emerald"
            aria-label="Beds to assign"
          />
          <Button
            type="button"
            variant="success"
            className="rounded-xl px-3 py-2 text-xs"
            disabled={busy || !canAssign}
            onClick={() => onAssign(beds)}
          >
            {busy ? "Assigning…" : "Assign"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ShelterEditor({
  shelter,
  busy,
  onSave,
}: {
  shelter: ShelterOption;
  busy: boolean;
  onSave: (occupied: number, supplies: SuppliesStatus) => void;
}) {
  const [occupied, setOccupied] = useState(shelter.occupied_beds);
  const [supplies, setSupplies] = useState(shelter.supplies_status);
  const used = occupied;
  const fill = shelter.total_beds > 0 ? Math.min(100, (used / shelter.total_beds) * 100) : 0;
  const dirty = occupied !== shelter.occupied_beds || supplies !== shelter.supplies_status;

  useEffect(() => {
    setOccupied(shelter.occupied_beds);
    setSupplies(shelter.supplies_status);
  }, [shelter.occupied_beds, shelter.supplies_status]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <strong className="text-sm font-extrabold text-slate-900">{shelter.name}</strong>
      <p className="mt-1 text-xs font-medium text-slate-500">
        {shelter.total_beds - occupied} free / {shelter.total_beds} · {wardName(shelter.ward_id)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full"
          style={{ width: `${fill}%`, background: shelter.total_beds - occupied < 10 ? "#e11d48" : "#10b981" }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
            disabled={busy || occupied <= 0}
            onClick={() => setOccupied((value) => Math.max(0, value - 1))}
            aria-label="Decrease occupied beds"
          >
            −
          </button>
          <span className="min-w-10 border-x border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-slate-700">
            {occupied}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
            disabled={busy || occupied >= shelter.total_beds}
            onClick={() => setOccupied((value) => Math.min(shelter.total_beds, value + 1))}
            aria-label="Increase occupied beds"
          >
            +
          </button>
        </div>
        <select
          value={supplies}
          disabled={busy}
          onChange={(event) => setSupplies(event.target.value as SuppliesStatus)}
          className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-status-emerald focus:outline-none"
          aria-label="Supplies status"
        >
          {SUPPLY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Supplies {option.toLowerCase()}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="success"
          className="rounded-xl px-3 py-2 text-xs"
          disabled={busy || !dirty}
          onClick={() => onSave(occupied, supplies)}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
