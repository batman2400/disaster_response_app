"use client";

import { ArrowLeft, Bell, Bot, Camera, Check, LocateFixed, Plus, TriangleAlert, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OfficerMap } from "@/app/dashboard/officer/OfficerMap";
import { PublicShell } from "@/components/public-shell";
import { BottomSheet, Button, Chip, StatusBadge } from "@/components/ui";
import { categoryLabel, PIN_COLORS, PIN_LEGEND, pinMeaning, wardShort } from "@/lib/format";
import type { ConfirmResponse, HazardRow, HazardStatus, WardRow } from "@/lib/types";
import { mapHazardRow, mapWardRow, sortHazards, sortWards, useLiveRows } from "@/lib/use-live";

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

export function PublicMap({
  initialHazards,
  initialWards,
}: {
  initialHazards: HazardRow[];
  initialWards: WardRow[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

  const visible = useMemo(
    () => hazards.filter((row) => (filter === "ALL" ? true : row.status === filter)),
    [hazards, filter],
  );
  const selected = hazards.find((row) => row.id === selectedId) ?? null;
  const criticalWard = wards.find((ward) => ward.status === "CRITICAL");
  const areaAlert = hazards.find((row) => row.status === "AREA_ALERT");
  const showAlert = !alertDismissed && Boolean(criticalWard || areaAlert);

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

  return (
    <PublicShell variant="bleed">
      <OfficerMap
        className="absolute inset-0 z-0 min-h-dvh"
        hazards={visible}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setConfirmed(false);
        }}
      />

      <div className="pointer-events-none absolute top-4 left-4 right-4 z-40 flex items-center gap-3 lg:right-auto lg:w-[min(36rem,calc(100vw-24rem))]">
        <Link
          href="/"
          className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/90 text-slate-700 shadow-soft backdrop-blur-md active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="pointer-events-auto flex h-12 flex-1 items-center gap-3 rounded-2xl border border-white/50 bg-white/90 px-4 shadow-soft backdrop-blur-md">
          <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-status-emerald" />
          </div>
          <p className="w-full truncate text-sm font-extrabold text-slate-800">
            {live ? "Live Status: Colombo" : "Updating Colombo…"}
          </p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
            <Bell className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <div
        className={`absolute left-4 z-40 flex gap-2 overflow-x-auto no-scrollbar lg:max-w-[min(36rem,calc(100vw-24rem))] ${
          showAlert ? "top-52" : "top-20"
        } right-4 lg:right-auto`}
      >
        {FILTERS.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)} className="inline-flex items-center shadow-soft">
            {item.id !== "ALL" ? (
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: PIN_COLORS[item.id] }} />
            ) : null}
            {item.label}
          </Chip>
        ))}
      </div>

      {showAlert ? (
        <div className="absolute top-32 left-4 right-4 z-40 rounded-3xl border border-status-crimson/20 bg-white/80 p-4 shadow-glow-red backdrop-blur-xl animate-slide-down-alert lg:right-auto lg:w-[min(36rem,calc(100vw-24rem))]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-crimson-bg text-status-crimson">
              <TriangleAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-slate-900">Critical Flood Warning</h3>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight text-slate-500">
                {criticalWard
                  ? `High water in ${wardShort(criticalWard.id)} · ${criticalWard.rainfall_mm} mm rain, river ${criticalWard.river_level_pct}%.`
                  : "An area alert is active. Avoid the marked route."}
              </p>
            </div>
            <button type="button" onClick={() => setAlertDismissed(true)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute z-30 max-w-[16.5rem] rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur-md ${
          selected ? "bottom-8 left-4 lg:bottom-8" : "bottom-8 left-4"
        }`}
      >
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">What pins mean</p>
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
        </ul>
      </div>

      <Link
        href="/report"
        className={`absolute bottom-8 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-glow-blue active:scale-90 ${
          selected ? "right-6 lg:right-[26rem]" : "right-6"
        }`}
      >
        <Plus className="h-7 w-7" />
      </Link>

      <div className="lg:hidden">
        <BottomSheet open={Boolean(selected)} onClose={() => setSelectedId(null)}>
          {selected ? (
            <HazardDetail
              selected={selected}
              confirmed={confirmed}
              confirmBusy={confirmBusy}
              onConfirm={(id) => void confirm(id)}
            />
          ) : null}
        </BottomSheet>
      </div>

      {selected ? (
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
            selected={selected}
            confirmed={confirmed}
            confirmBusy={confirmBusy}
            onConfirm={(id) => void confirm(id)}
          />
        </aside>
      ) : null}
    </PublicShell>
  );
}
