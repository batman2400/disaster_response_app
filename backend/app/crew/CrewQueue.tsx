"use client";

import { ChevronRight, LogOut, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { PublicShell } from "@/components/public-shell";
import { Badge, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { latestDispatchNote } from "@/lib/officer-log";
import { ROLE_THEME } from "@/lib/role-theme";
import type { HazardRow } from "@/lib/types";
import { mapHazardRow, useLiveRows } from "@/lib/use-live";

function sortCrewQueue(rows: HazardRow[]) {
  return [...rows].sort((a, b) => {
    const aDispatched = a.dispatched_at ? Date.parse(a.dispatched_at) : 0;
    const bDispatched = b.dispatched_at ? Date.parse(b.dispatched_at) : 0;
    if (Boolean(a.dispatched_at) !== Boolean(b.dispatched_at)) {
      return a.dispatched_at ? -1 : 1;
    }
    if (aDispatched !== bDispatched) return bDispatched - aDispatched;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function CrewQueue({ initialHazards }: { initialHazards: HazardRow[] }) {
  const { rows: hazards, live } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: sortCrewQueue(initialHazards),
    mapRow: mapHazardRow,
    sort: sortCrewQueue,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const open = useMemo(() => hazards.filter((row) => row.status !== "RESOLVED"), [hazards]);
  const dispatchedCount = open.filter((row) => row.dispatched_at).length;
  const theme = ROLE_THEME.crew;
  const Icon = theme.icon;

  return (
    <PublicShell>
      <div className={cn("flex items-center justify-between border-t-4 px-6 pb-2 pt-8 lg:px-10 lg:pt-10", theme.accent)}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white", theme.iconBg, theme.glow)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className={cn("text-[10px] font-extrabold uppercase tracking-widest", theme.chipText)}>{theme.label}</p>
            <h1 className="text-lg font-extrabold text-slate-900 lg:text-2xl">Open tasks</h1>
          </div>
        </div>
        <form action="/api/dashboard/logout" method="post">
          <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
      <p className="px-6 pb-4 text-xs font-medium text-slate-400 lg:px-10">
        {live ? "Live queue" : "Refreshing…"} · {open.length} open
        {dispatchedCount ? ` · ${dispatchedCount} dispatched` : ""}
      </p>
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-10 lg:px-10">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {open.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/crew/${ticket.id}`}
              className={`flex items-center gap-4 rounded-3xl border bg-white p-5 shadow-soft active:scale-[0.99] lg:hover:border-brand ${
                ticket.dispatched_at ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-100"
              }`}
            >
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-extrabold text-slate-400">
                    #{ticket.id.slice(0, 8).toUpperCase()}
                  </span>
                  <StatusBadge status={ticket.status} />
                  <UrgencyBadge urgency={ticket.urgency} />
                  {ticket.dispatched_at ? (
                    <Badge className="bg-indigo-50 text-brand-indigo">
                      <Truck className="mr-1 h-3 w-3" />
                      Dispatched
                    </Badge>
                  ) : null}
                </div>
                <h3 className="font-extrabold text-slate-900">{categoryLabel(ticket.category)}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {wardShort(ticket.ward_id)} · {timeAgo(ticket.created_at)}
                </p>
                {ticket.dispatched_at ? (
                  <p className="mt-2 text-[11px] font-semibold text-brand-indigo">
                    {latestDispatchNote(ticket) || "Officer sent this to the field queue."}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
          {open.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-sm font-semibold text-slate-400 lg:col-span-2">
              No open tickets right now.
            </div>
          ) : null}
        </div>
      </div>
    </PublicShell>
  );
}
