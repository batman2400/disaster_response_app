"use client";

import { ArrowLeft, CloudRain, Globe, Play, RotateCcw, Server, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button, Chip, SectionLabel, WardBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { wardShort } from "@/lib/format";
import { REPLAY_CLOCK_END, REPLAY_CLOCK_START } from "@/lib/replay-const";
import type { ReplayEventType, ReplayState, WardId, WardRow, WardStatus } from "@/lib/types";
import { mapWardRow, sortWards, useLiveRows } from "@/lib/use-live";

const EVENT_TONE: Record<ReplayEventType, { bar: string; tag: string; label: string }> = {
  system: { bar: "bg-slate-300", tag: "text-slate-500", label: "System" },
  warn: { bar: "bg-status-amber", tag: "text-status-amber", label: "Warning" },
  critical: { bar: "bg-status-crimson", tag: "text-status-crimson", label: "Breach" },
  alert: { bar: "bg-brand", tag: "text-brand", label: "Action" },
  success: { bar: "bg-status-emerald", tag: "text-status-emerald", label: "Resolved" },
};

function toneFor(status: WardStatus) {
  if (status === "CRITICAL") {
    return {
      value: "text-status-crimson",
      bar: "bg-status-crimson",
      ring: "ring-2 ring-status-crimson/50 animate-urgent-pulse",
    };
  }
  if (status === "WATCH") {
    return { value: "text-status-amber", bar: "bg-status-amber", ring: "" };
  }
  return { value: "text-status-emerald", bar: "bg-status-emerald", ring: "" };
}

function progressPct(replay: ReplayState) {
  if (replay.phase === "idle") return 0;
  if (replay.total <= 1) return replay.phase === "completed" ? 100 : 0;
  return Math.round((replay.tick / (replay.total - 1)) * 100);
}

function Gauge({
  label,
  unit,
  value,
  width,
  threshold,
  status,
  icon,
}: {
  label: string;
  unit: string;
  value: number;
  width: number;
  threshold: number;
  status: WardStatus;
  icon: ReactNode;
}) {
  const tone = toneFor(status);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-slate-100 bg-white/90 p-4 shadow-soft backdrop-blur-md transition-all duration-300",
        tone.ring,
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand">
          {icon}
        </div>
        <WardBadge status={status} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="mt-0.5 flex items-end gap-1">
        <span className={cn("metric-value font-mono text-2xl font-extrabold", tone.value)}>
          {Math.round(value)}
        </span>
        <span className="mb-1 text-xs font-bold text-slate-400">{unit}</span>
      </div>
      <div className="relative mt-3 h-1 w-full rounded-full bg-slate-100">
        <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-status-crimson" style={{ left: `${threshold}%` }} />
        <div className={cn("metric-bar h-full rounded-full", tone.bar)} style={{ width: `${Math.min(width, 100)}%` }} />
      </div>
    </div>
  );
}

export function WeatherReplay({
  wards,
  initialReplay,
}: {
  wards: WardRow[];
  initialReplay: ReplayState;
}) {
  const [replay, setReplay] = useState(initialReplay);
  const [wardId, setWardId] = useState<WardId>(initialReplay.ward_id);
  const [busy, setBusy] = useState<"start" | "reset" | null>(null);
  const [error, setError] = useState("");

  const { rows: liveWards, live } = useLiveRows<WardRow>({
    table: "wards",
    initial: wards,
    mapRow: mapWardRow,
    sort: sortWards,
    fallbackFetch: () => fetch("/api/wards").then((res) => res.json() as Promise<WardRow[]>),
  });

  const target = useMemo(
    () => liveWards.find((ward) => ward.id === replay.ward_id) ?? liveWards.find((ward) => ward.id === wardId),
    [liveWards, replay.ward_id, wardId],
  );

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const res = await fetch("/api/dashboard/admin/replay");
      if (!res.ok || cancelled) return;
      const next = (await res.json()) as ReplayState;
      if (!cancelled) setReplay(next);
    };

    void pull();
    if (replay.phase !== "running") return;
    const id = setInterval(() => {
      void pull();
    }, 800);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [replay.phase]);

  async function post(path: "/start" | "/reset", body?: object) {
    setError("");
    setBusy(path === "/start" ? "start" : "reset");
    try {
      const res = await fetch(`/api/dashboard/admin/replay${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const next = (await res.json()) as ReplayState & { error?: string };
      if (!res.ok) {
        setError(next.error || "Replay request failed");
        return;
      }
      setReplay(next);
      setWardId(next.ward_id);
    } catch {
      setError("Replay request failed");
    } finally {
      setBusy(null);
    }
  }

  const running = replay.phase === "running";
  const idle = replay.phase === "idle";
  const rain = target?.rainfall_mm ?? 12;
  const river = target?.river_level_pct ?? 45;
  const status = target?.status ?? "NORMAL";
  const progress = progressPct(replay);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50 text-slate-800">
      <div className="pointer-events-none absolute -left-16 -top-24 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-6 pb-16 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard/officer"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Simulation Control</h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-600">
              Automated Feeds
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm">
            <Server className="h-4 w-4" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <div className="mb-6 rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-soft backdrop-blur-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <CloudRain className="h-4 w-4 text-brand" />
                    rainy-day-replay
                  </h2>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    Server ticks ward telemetry over a compressed 14:00–18:00 storm
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-widest",
                    running && "animate-pulse bg-cyan-100 text-cyan-700",
                    replay.phase === "completed" && "bg-status-emerald-bg text-status-emerald",
                    idle && "bg-slate-100 text-slate-500",
                  )}
                >
                  {replay.phase}
                </span>
              </div>

              <div className="relative mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-cyan-500 transition-all duration-700 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mb-5 flex justify-between font-mono text-[10px] font-bold text-slate-400">
                <span>{idle ? REPLAY_CLOCK_START : replay.clock}</span>
                <span>{REPLAY_CLOCK_END}</span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {liveWards.map((ward) => (
                  <Chip
                    key={ward.id}
                    active={wardId === ward.id}
                    onClick={() => {
                      if (!running) setWardId(ward.id);
                    }}
                    className={cn(running && "cursor-not-allowed opacity-60")}
                  >
                    {wardShort(ward.id)}
                  </Chip>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-brand to-cyan-400 shadow-glow-cyan"
                  disabled={running || busy !== null}
                  onClick={() => post("/start", { ward_id: wardId })}
                >
                  <Play className="h-4 w-4" />
                  {busy === "start" ? "Starting…" : "Simulate Storm"}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl border-cyan-200 bg-cyan-50/50 text-cyan-700 hover:bg-cyan-100/70"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy("reset");
                    setError("");
                    try {
                      const res = await fetch("/api/weather/live", { method: "POST" });
                      if (res.ok) {
                        setError("Synced live telemetry with Open-Meteo API!");
                      } else {
                        setError("Failed to sync live weather");
                      }
                    } catch {
                      setError("Network error syncing live weather");
                    } finally {
                      setBusy(null);
                    }
                  }}
                  title="Sync live Open-Meteo telemetry"
                >
                  <Globe className="h-4 w-4 mr-1.5 text-cyan-600" />
                  Sync Live
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl px-5"
                  aria-label="Reset feed"
                  disabled={idle && busy === null}
                  onClick={() => post("/reset")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {error ? (
                <p className={cn("mt-3 text-xs font-semibold", error.includes("Synced") ? "text-status-emerald" : "text-status-crimson")}>
                  {error}
                </p>
              ) : null}
            </div>

            <SectionLabel hint={<span className="font-mono text-[10px] text-slate-400">{target?.id}</span>}>
              Live Sensor Telemetry
            </SectionLabel>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Gauge
                label="Rainfall"
                unit="mm"
                value={rain}
                width={rain}
                threshold={40}
                status={status}
                icon={<CloudRain className="h-4 w-4" />}
              />
              <Gauge
                label="River Lvl"
                unit="%"
                value={river}
                width={river}
                threshold={75}
                status={status}
                icon={<Waves className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {liveWards.map((ward) => (
                <div key={ward.id} className="rounded-2xl border border-slate-100 bg-white/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold text-slate-600">{wardShort(ward.id)}</p>
                    <WardBadge status={ward.status} />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    {Math.round(ward.rainfall_mm)}mm · {Math.round(ward.river_level_pct)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <SectionLabel
              hint={
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      running || live ? "animate-ping bg-status-emerald" : "bg-slate-300",
                    )}
                  />
                  <span className={cn("text-[9px] font-bold uppercase", running ? "text-status-emerald" : "text-slate-400")}>
                    {running ? "Live feed" : replay.phase === "completed" ? "Feed ended" : "Awaiting feed"}
                  </span>
                </div>
              }
            >
              System Event Stream
            </SectionLabel>
            <div className="flex flex-col gap-3">
              {replay.events.length === 0 ? (
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white/60 p-3 opacity-70">
                  <div className="w-1.5 shrink-0 rounded-full bg-slate-200" />
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-400">{REPLAY_CLOCK_START}:00</span>
                      <span className="text-[9px] font-bold uppercase text-slate-500">System</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      Telemetry feed initialized. Listening for data...
                    </p>
                  </div>
                </div>
              ) : (
                replay.events.map((event) => {
                  const tone = EVENT_TONE[event.type];
                  return (
                    <div
                      key={`${event.at}-${event.message}`}
                      className="stream-item-enter flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                    >
                      <div className={cn("w-1.5 shrink-0 rounded-full", tone.bar)} />
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-[9px] text-slate-400">{event.clock}:00</span>
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider", tone.tag)}>
                            {tone.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700">{event.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
