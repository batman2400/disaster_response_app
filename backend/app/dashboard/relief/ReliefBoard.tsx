"use client";

import { useMemo } from "react";

import { PIN_COLORS, URGENCY_COLORS, wardName, wardShort } from "@/lib/format";
import type { HazardRow, ShelterRow, SuppliesStatus } from "@/lib/types";
import { mapHazardRow, mapShelterRow, sortHazards, useLiveRows } from "@/lib/use-live";

type ShelterOption = ShelterRow & { free: number };

const SUPPLY_COLORS: Record<SuppliesStatus, string> = {
  ADEQUATE: "#2F9E6A",
  LOW: "#F5A524",
  CRITICAL: "#E23B3B",
};

export function ReliefBoard({
  initialHazards,
  initialShelters,
}: {
  initialHazards: HazardRow[];
  initialShelters: ShelterRow[];
}) {
  const { rows: hazards, updatedAt, live } = useLiveRows<HazardRow>({
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
    <main className="dash-main">
      <p className="dash-kicker">SHELTER LOGISTICS</p>
      <h2 style={{ fontSize: 32, margin: "4px 0 8px" }}>Match requests to beds</h2>
      <p className="sub">
        Help requests matched to shelters in the same ward, sorted by free beds. Filter and sort only — no
        routing algorithm.
      </p>
      <p className="poll">
        {live ? "Live" : "Polling every 8s"} · last update {updatedAt.toLocaleTimeString()}
      </p>

      <div className="stat-row" style={{ margin: "18px 0 16px" }}>
        <div className="stat">
          <span>Open requests</span>
          <strong style={{ color: "var(--amber)" }}>{requests.length}</strong>
        </div>
        <div className="stat">
          <span>Free beds</span>
          <strong style={{ color: "var(--green)" }}>{freeBeds}</strong>
        </div>
        <div className="stat">
          <span>Supply watch</span>
          <strong style={{ color: "var(--red)" }}>{tight}</strong>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="empty">No open help requests.</div>
      ) : (
        <div className="relief-list">
          {matches.map(({ request, options }) => (
            <article key={request.id} className="card" style={{ borderLeftColor: "var(--purple)" }}>
              <div className="badge-row">
                <span className="badge" style={{ color: PIN_COLORS[request.status] }}>
                  {request.status}
                </span>
                <span className="badge" style={{ color: URGENCY_COLORS[request.urgency] }}>
                  {request.urgency}
                </span>
                <span className="badge" style={{ color: "var(--blue)" }}>
                  {wardShort(request.ward_id)}
                </span>
              </div>
              <strong className="card-title">{request.description}</strong>
              <p className="meta">{wardName(request.ward_id)}</p>
              {options.length === 0 ? (
                <p className="warn">No shelter listed in this ward.</p>
              ) : (
                options.map((shelter, index) => (
                  <ShelterCard key={shelter.id} shelter={shelter} recommended={index === 0} />
                ))
              )}
            </article>
          ))}
        </div>
      )}

      <p className="section-title" style={{ margin: "22px 0 10px" }}>
        ALL SHELTERS
      </p>
      {shelters.map((shelter) => (
        <ShelterCard
          key={`all-${shelter.id}`}
          shelter={{ ...shelter, free: shelter.total_beds - shelter.occupied_beds }}
        />
      ))}
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
    <div className={`shelter${recommended ? " best" : ""}`}>
      <div className="shelter-head">
        <strong className="shelter-name">{shelter.name}</strong>
        {recommended ? (
          <span className="badge" style={{ color: "var(--green)" }}>
            BEST FIT
          </span>
        ) : null}
      </div>
      <p className="meta">
        {shelter.free} free / {shelter.total_beds} · {wardName(shelter.ward_id)}
      </p>
      <div className="meter">
        <span style={{ width: `${fill}%`, background: shelter.free < 10 ? "var(--red)" : "var(--green)" }} />
      </div>
      <p className="meta" style={{ color: SUPPLY_COLORS[shelter.supplies_status], marginTop: 8 }}>
        Supplies {shelter.supplies_status.toLowerCase()}
      </p>
    </div>
  );
}
