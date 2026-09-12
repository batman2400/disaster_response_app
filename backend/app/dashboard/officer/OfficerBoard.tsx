"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { categoryLabel, PIN_COLORS, scorePct, timeAgo, URGENCY_COLORS, WARD_STATUS_COLORS, wardShort } from "@/lib/format";
import type { HazardRow, HazardStatus, WardRow } from "@/lib/types";

const FILTERS = [
  { id: "OPEN", label: "Open" },
  { id: "PENDING", label: "Pending" },
  { id: "NEED_INFO", label: "Need info" },
  { id: "ALERT", label: "Alerts" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function OfficerBoard({
  initialHazards,
  initialWards,
}: {
  initialHazards: HazardRow[];
  initialWards: WardRow[];
}) {
  const [tickets, setTickets] = useState(initialHazards);
  const [wards, setWards] = useState(initialWards);
  const [note, setNote] = useState("confirmed via CCTV");
  const [filter, setFilter] = useState<FilterId>("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const load = useCallback(async () => {
    const [nextTickets, nextWards] = await Promise.all([
      fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
      fetch("/api/wards").then((res) => res.json() as Promise<WardRow[]>),
    ]);
    setTickets(nextTickets);
    setWards(nextWards);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const visible = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filter === "OPEN") return ticket.status !== "RESOLVED";
      if (filter === "ALERT") return ticket.status === "AREA_ALERT" || ticket.urgency === "CRITICAL";
      return ticket.status === filter;
    });
  }, [tickets, filter]);

  const openCount = tickets.filter((ticket) => ticket.status !== "RESOLVED").length;
  const needInfo = tickets.filter((ticket) => ticket.status === "NEED_INFO").length;
  const critical = tickets.filter((ticket) => ticket.urgency === "CRITICAL").length;

  async function override(incident_id: string, new_status: HazardStatus) {
    setBusyId(incident_id);
    setError("");
    try {
      const response = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id, new_status, officer_note: note }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Override failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="dash-main">
      <p className="dash-kicker">TICKET QUEUE</p>
      <h2 style={{ fontSize: 32, margin: "4px 0 8px" }}>Confirm or hold reports</h2>
      <p className="sub">Confirm publishes a pin. Need info holds it for nearby confirmations.</p>
      <p className="poll">Live poll every 8s · last refresh {updatedAt.toLocaleTimeString()}</p>

      <div className="ward-row">
        {wards.map((ward) => (
          <div key={ward.id} className="ward-chip">
            <span className="badge" style={{ color: WARD_STATUS_COLORS[ward.status] }}>
              {ward.status}
            </span>
            <strong>{wardShort(ward.id)}</strong>
            <span className="meta">
              {ward.rainfall_mm} mm · {ward.river_level_pct}% river
            </span>
          </div>
        ))}
      </div>

      <div className="stat-row">
        <div className="stat">
          <span>Open</span>
          <strong style={{ color: "var(--amber)" }}>{openCount}</strong>
        </div>
        <div className="stat">
          <span>Need info</span>
          <strong style={{ color: "var(--blue)" }}>{needInfo}</strong>
        </div>
        <div className="stat">
          <span>Critical</span>
          <strong style={{ color: "var(--red)" }}>{critical}</strong>
        </div>
      </div>

      <div className="toolbar">
        <label className="field-label">
          Officer note
          <input className="note-input" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="filter-row">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip${filter === item.id ? " on" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {visible.length === 0 ? (
        <div className="empty">No tickets match this filter.</div>
      ) : (
        <div className="ticket-list">
          {visible.map((ticket) => (
            <article key={ticket.id} className="card" style={{ borderLeftColor: PIN_COLORS[ticket.status] }}>
              <div className="badge-row">
                <span className="badge" style={{ color: PIN_COLORS[ticket.status] }}>
                  {ticket.status}
                </span>
                <span className="badge" style={{ color: URGENCY_COLORS[ticket.urgency] }}>
                  {ticket.urgency}
                </span>
              </div>
              <strong className="card-title">
                {categoryLabel(ticket.category)} · {scorePct(ticket.confidence_score)}
              </strong>
              <p className="sub" style={{ marginTop: 6 }}>
                {ticket.description}
              </p>
              <p className="meta">
                {wardShort(ticket.ward_id)} · {ticket.confirmations_count} confirms · {timeAgo(ticket.created_at)}
              </p>
              {ticket.photo_url ? <img className="photo" src={ticket.photo_url} alt="" /> : null}
              {ticket.status !== "RESOLVED" ? (
                <div className="action-row">
                  <button
                    type="button"
                    className="primary small"
                    disabled={busyId === ticket.id}
                    onClick={() => void override(ticket.id, "PUBLISHED")}
                  >
                    {busyId === ticket.id ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    className="ghost small"
                    disabled={busyId === ticket.id}
                    onClick={() => void override(ticket.id, "NEED_INFO")}
                  >
                    Need info
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
