"use client";

import { Bot, Bug, Clock, Code, LocateFixed, Route, SlidersHorizontal, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OfficerMap } from "./OfficerMap";
import { Badge, Button, Card, Chip, SectionLabel, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { OFFICER_ACTION_LABEL } from "@/lib/officer-log";
import { parseTrace } from "@/lib/trace";
import type { HazardRow, HazardStatus, OfficerAction, WardRow } from "@/lib/types";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/use-live";

const FILTERS = [
  { id: "OPEN", label: "Open" },
  { id: "PENDING", label: "Pending AI" },
  { id: "PUBLISHED", label: "Published" },
  { id: "NEED_INFO", label: "Need info" },
  { id: "ALERT", label: "Alerts" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

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
        })),
    };
  }
  return {
    inferred: true,
    tiles: [
      { id: "image", label: "Image AI", value: "No stored run", passed: false },
      { id: "location", label: "Loc AI", value: "No stored run", passed: false },
      { id: "cluster", label: "Cluster", value: "Not stored", passed: false },
      { id: "weather", label: "Weather", value: "Not stored", passed: false },
      { id: "risk", label: "Risk AI", value: `${ticket.urgency} · stored`, passed: ticket.urgency !== "LOW" },
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialHazards[0]?.id ?? null);

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

  const visible = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesFilter =
        filter === "OPEN"
          ? ticket.status !== "RESOLVED"
          : filter === "ALERT"
            ? ticket.status === "AREA_ALERT" || ticket.urgency === "CRITICAL"
            : ticket.status === filter;
      const hay = `${ticket.id} ${ticket.description ?? ""} ${wardShort(ticket.ward_id)} ${ticket.category}`.toLowerCase();
      return matchesFilter && hay.includes(query.toLowerCase());
    });
  }, [tickets, filter, query]);

  const selected = tickets.find((row) => row.id === selectedId) ?? visible[0] ?? null;
  const ward = selected ? wards.find((row) => row.id === selected.ward_id) : undefined;
  const openCount = tickets.filter((ticket) => ticket.status !== "RESOLVED").length;
  const selectedTrace = selected
    ? parseTrace(selected.trace) ?? parseTrace(initialHazards.find((row) => row.id === selected.id)?.trace)
    : null;
  const checks = selected ? checkTiles(selected, selectedTrace) : null;

  async function override(
    incident_id: string,
    new_status: HazardStatus,
    officer_note: string,
    action: OfficerAction,
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id, new_status, officer_note, action }),
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

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Incident Queue</h2>
            <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">{openCount} Active</span>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ID, location..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((item) => (
              <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </Chip>
            ))}
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
                  "relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-colors",
                  active ? "border-2 border-brand shadow-soft" : "border-slate-200 hover:border-slate-300",
                  ticket.status === "RESOLVED" && "opacity-60",
                )}
              >
                {active ? <span className="absolute inset-y-0 left-0 w-1.5 bg-brand" /> : null}
                <div className={cn("flex items-start justify-between", active && "pl-2")}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold text-slate-400">
                      #{ticket.id.slice(0, 8).toUpperCase()}
                    </span>
                    <UrgencyBadge urgency={ticket.urgency} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{timeAgo(ticket.created_at)}</span>
                </div>
                <h3 className={cn("mt-2 text-sm font-extrabold text-slate-900", active && "pl-2")}>
                  {categoryLabel(ticket.category)}
                </h3>
                <p className={cn("mt-0.5 truncate text-xs font-medium text-slate-500", active && "pl-2")}>
                  {wardShort(ticket.ward_id)}
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
            <p className="p-6 text-center text-sm font-semibold text-slate-400">No tickets match this filter.</p>
          ) : null}
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
        {selected ? (
          <>
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Case #{selected.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <StatusBadge status={selected.status} />
                  {selected.dispatched_at ? (
                    <Badge className="bg-indigo-50 text-brand-indigo">
                      <Truck className="mr-1 h-3 w-3" />
                      Dispatched
                    </Badge>
                  ) : null}
                </div>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {live ? "Live" : "Polling"} · reported {timeAgo(selected.created_at)}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/admin/pipeline/${selected.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 hover:border-brand hover:text-brand"
                >
                  <Bug className="h-4 w-4" /> Pipeline audit
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl px-4 py-2 text-sm"
                  disabled={busy}
                  onClick={() =>
                    void override(
                      selected.id,
                      selected.status,
                      note || "Suggested detour logged — no routing engine in v1.",
                      "detour",
                    )
                  }
                >
                  <Route className="h-4 w-4" /> Suggest Detour
                </Button>
                <Button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm"
                  disabled={busy}
                  onClick={() =>
                    void override(
                      selected.id,
                      selected.status,
                      note || "Dispatch requested — visible in the field crew queue.",
                      "dispatch",
                    )
                  }
                >
                  <Truck className="h-4 w-4" />
                  {selected.dispatched_at ? "Update dispatch" : "Dispatch Crew"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6">
                  <Card className="p-4">
                    <SectionLabel>1. Evidence</SectionLabel>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
                      {selected.photo_url ? (
                        <img src={selected.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">No photo</div>
                      )}
                    </div>
                  </Card>
                  <Card className="relative overflow-hidden p-5">
                    <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
                    <SectionLabel>2. Telemetry</SectionLabel>
                    <div className="relative z-10">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
                          <LocateFixed className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{wardShort(selected.ward_id)}</h4>
                          <p className="text-xs font-medium text-slate-500">Colombo</p>
                          <div className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                            {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">Local Rain</div>
                          <div className="font-mono text-sm font-extrabold text-slate-700">
                            {ward?.rainfall_mm ?? "—"} mm
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">River Lvl</div>
                          <div className="font-mono text-sm font-extrabold text-status-crimson">
                            {ward?.river_level_pct ?? "—"}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div className="relative h-56 overflow-hidden rounded-3xl border border-slate-100">
                    <OfficerMap
                      className="absolute inset-0"
                      hazards={tickets}
                      selectedId={selected.id}
                      onSelect={setSelectedId}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:col-span-2">
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl">
                    <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-brand opacity-20 blur-[80px]" />
                    <div className="relative z-10 mb-6 flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                          <Bot className="h-3.5 w-3.5" /> System Aggregator Verdict
                        </h3>
                        <p className="max-w-xl text-sm font-medium leading-relaxed text-white/90">
                          {selectedTrace?.verdict.reasoning ||
                            selected.description ||
                            "No aggregator reasoning stored on this ticket yet. File a new report to capture a live trace."}
                        </p>
                      </div>
                      <div className="flex flex-col items-center rounded-xl border border-brand/30 bg-brand/20 px-4 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-light">Score</span>
                        <span className="font-mono text-xl font-extrabold text-white">
                          {selected.confidence_score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {checks?.inferred ? (
                      <div className="relative z-10 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-bold text-amber-300">
                          Inferred summary — no stored pipeline run. Cluster and weather are not reconstructed from live confirmations or current ward telemetry.
                        </p>
                      </div>
                    ) : null}
                    <div className="relative z-10 grid grid-cols-5 gap-2">
                      {checks?.tiles.map((tile) => (
                        <div
                          key={tile.id}
                          className={cn(
                            "rounded-xl border p-3 text-center",
                            checks.inferred
                              ? "border-amber-500/20 bg-amber-500/5"
                              : "border-white/10 bg-white/5",
                          )}
                        >
                          <div
                            className={cn(
                              "mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
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
                        </div>
                      ))}
                    </div>
                  </div>

                  <Card className="border-slate-200 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                        <SlidersHorizontal className="h-4 w-4 text-slate-400" /> Officer Override & Tuning
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400">
                        POST /api/override
                      </span>
                    </div>
                    <p className="mb-5 text-xs font-medium text-slate-500">
                      Override the AI verdict. Notes append to an officer trail and confirming or rejecting nudges pipeline thresholds.
                    </p>
                    {(selected.officer_log?.length ?? 0) > 0 ? (
                      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Officer trail
                        </p>
                        {selected.officer_log?.map((entry) => (
                          <div key={`${entry.at}-${entry.action}`} className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-extrabold text-slate-700">
                                {OFFICER_ACTION_LABEL[entry.action]}
                              </p>
                              <p className="text-xs font-medium text-slate-500">{entry.note}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-slate-400">{timeAgo(entry.at)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional note for this action…"
                      className="mb-4 h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    {error ? <p className="mb-3 text-sm font-semibold text-status-crimson">{error}</p> : null}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="danger"
                        className="flex-1 rounded-xl"
                        disabled={busy}
                        onClick={() =>
                          void override(selected.id, "COUNCIL_TICKET", note || "Rejected / unpublished", "reject")
                        }
                      >
                        Reject & Unpublish
                      </Button>
                      <Button
                        type="button"
                        variant="amber"
                        className="flex-1 rounded-xl"
                        disabled={busy}
                        onClick={() =>
                          void override(selected.id, "NEED_INFO", note || "Reverted to crowdsource", "crowdsource")
                        }
                      >
                        Revert to Crowdsource
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 rounded-xl"
                        disabled={busy}
                        onClick={() =>
                          void override(selected.id, "PUBLISHED", note || "Confirmed via officer review", "confirm")
                        }
                      >
                        Confirm & Publish
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-400">
            Select a ticket to inspect the pipeline.
          </div>
        )}
      </section>
    </div>
  );
}
