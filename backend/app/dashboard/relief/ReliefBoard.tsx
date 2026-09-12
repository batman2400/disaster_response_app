"use client";

import { useMemo } from "react";

import { Card, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { wardName, wardShort } from "@/lib/format";
import type { HazardRow, ShelterRow, SuppliesStatus } from "@/lib/types";
import { mapHazardRow, mapShelterRow, sortHazards, useLiveRows } from "@/lib/use-live";

type ShelterOption = ShelterRow & { free: number };

const SUPPLY_TONE: Record<SuppliesStatus, string> = {
  ADEQUATE: "text-status-emerald",
  LOW: "text-status-amber",
  CRITICAL: "text-status-crimson",
};

export function ReliefBoard({
  initialHazards,
  initialShelters,
}: {
  initialHazards: HazardRow[];
  initialShelters: ShelterRow[];
}) {
  const { rows: hazards, live, updatedAt } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: initialHazards,
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });
  const { rows: shelters } = useLiveRows<ShelterRow>({
    table: "shelters",
    initial: initialShelters,
    mapRow: mapShelterRow,
    fallbackFetch: () => fetch("/api/shelters").then((res) => res.json() as Promise<ShelterRow[]>),
  });

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

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Shelter Logistics</p>
      <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Match requests to beds</h2>
      <p className="mt-2 text-sm font-medium text-slate-500">
        Help requests matched to shelters in the same ward, sorted by free beds.
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">
        {live ? "Live" : "Polling"} · last update {updatedAt.toLocaleTimeString()}
      </p>

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
                    <ShelterCard key={shelter.id} shelter={shelter} recommended={index === 0} />
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
          <ShelterCard
            key={`all-${shelter.id}`}
            shelter={{ ...shelter, free: shelter.total_beds - shelter.occupied_beds }}
          />
        ))}
      </div>
    </main>
  );
}

function ShelterCard({
  shelter,
  recommended = false,
}: {
  shelter: ShelterOption;
  recommended?: boolean;
}) {
  const used = shelter.total_beds - shelter.free;
  const fill = shelter.total_beds > 0 ? Math.min(100, (used / shelter.total_beds) * 100) : 0;
  return (
    <div className={`rounded-2xl border p-4 ${recommended ? "border-brand bg-brand-light/40" : "border-slate-100 bg-slate-50"}`}>
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
    </div>
  );
}
