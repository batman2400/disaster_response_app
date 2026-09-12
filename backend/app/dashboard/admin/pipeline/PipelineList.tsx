"use client";

import { ArrowLeft, Bug, ChevronRight, CircleHelp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { StatusBadge } from "@/components/ui";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { parseTrace } from "@/lib/trace";
import type { HazardRow } from "@/lib/types";
import { mapHazardRow, sortHazards, useLiveRows } from "@/lib/use-live";

export function PipelineList({ hazards }: { hazards: HazardRow[] }) {
  const { rows: live } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: hazards,
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });
  const rows = useMemo(
    () =>
      live.map((row) => ({
        ...row,
        trace: row.trace ?? hazards.find((item) => item.id === row.id)?.trace ?? null,
      })),
    [live, hazards],
  );

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-16 pt-6">
      <div className="pointer-events-none absolute -left-20 -top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 -right-16 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/officer"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-[#1e293b] text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-white">Pipeline Audit</h1>
          <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-purple-400">
            DEV_ENV · TRACES
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/20 text-cyan-300">
          <Bug className="h-4 w-4" />
        </div>
      </div>

      <p className="relative z-10 mb-4 text-xs font-medium text-slate-400">
        Every new report stores per-check timing and source on <span className="font-mono text-cyan-300">hazards.trace</span>.
        Older tickets show an inferred summary until a live run lands.
      </p>

      <div className="relative z-10 flex flex-col gap-3">
        {rows.map((ticket) => {
          const stored = parseTrace(ticket.trace);
          return (
            <Link
              key={ticket.id}
              href={`/dashboard/admin/pipeline/${ticket.id}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-[#1e293b]/90 p-4 transition-colors hover:border-cyan-400/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                {stored ? <Bug className="h-4 w-4 text-cyan-300" /> : <CircleHelp className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-extrabold text-cyan-300">
                    {ticket.id.slice(0, 8).toUpperCase()}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-1 truncate text-sm font-bold text-white">
                  {categoryLabel(ticket.category)} · {wardShort(ticket.ward_id)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                  {stored ? `${stored.total_ms}ms · ${stored.steps.length} steps` : "inferred · no stored trace"} ·{" "}
                  {timeAgo(ticket.created_at)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>
          );
        })}
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-[#1e293b] p-8 text-center text-sm text-slate-400">
            No hazards yet. File a citizen report to capture a live trace.
          </p>
        ) : null}
      </div>
    </div>
  );
}
