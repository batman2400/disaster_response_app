"use client";

import { ArrowLeft, Bug, CheckCircle2, Copy, Cpu, Download, Headphones, Radio, Server } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AudioPlayer } from "@/components/audio-player";

import { cn } from "@/lib/cn";
import { categoryLabel, wardShort } from "@/lib/format";
import { inferTrace, parseTrace, eventBusFromTrace, exportTracePayload } from "@/lib/trace";
import type { CheckSource, HazardRow, HazardStatus, TraceEventTone, TraceStep } from "@/lib/types";
import { mapHazardRow, sortHazards, useLiveRows } from "@/lib/use-live";

const TABS = [
  { id: "trace", label: "Trace" },
  { id: "json", label: "Raw JSON" },
  { id: "bus", label: "Event Bus" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SOURCE_LABEL: Record<CheckSource, string> = {
  gemini: "gemini",
  mock: "mock",
  fallback: "fallback",
  code: "sys",
};

const DOT: Record<TraceStep["id"], string> = {
  summary: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]",
  image: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]",
  weather: "bg-slate-400",
  cluster: "bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]",
  location: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]",
  risk: "bg-amber-400",
  aggregator: "bg-rose-500 shadow-[0_0_14px_rgba(225,29,72,0.6)]",
  resolution: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]",
};

const TONE: Record<TraceEventTone, string> = {
  slate: "border-slate-600",
  cyan: "border-cyan-400",
  purple: "border-purple-400",
  emerald: "border-emerald-400",
  crimson: "border-rose-500",
  amber: "border-amber-400",
};

const TOPIC: Record<TraceEventTone, string> = {
  slate: "bg-slate-700 text-slate-300",
  cyan: "bg-cyan-400/20 text-cyan-300",
  purple: "bg-purple-400/20 text-purple-300",
  emerald: "bg-emerald-400/20 text-emerald-300",
  crimson: "bg-rose-500/20 text-rose-300",
  amber: "bg-amber-400/20 text-amber-300",
};

const VERDICT_STYLE: Record<
  HazardStatus,
  {
    border: string;
    text: string;
    glow: string;
    dot: string;
    bgBadge: string;
  }
> = {
  NEED_INFO: {
    border: "border-amber-500/40",
    text: "text-amber-400",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    dot: "bg-amber-400",
    bgBadge: "bg-amber-400/20 text-amber-300 border border-amber-500/30",
  },
  PENDING: {
    border: "border-amber-500/40",
    text: "text-amber-400",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    dot: "bg-amber-400",
    bgBadge: "bg-amber-400/20 text-amber-300 border border-amber-500/30",
  },
  AREA_ALERT: {
    border: "border-rose-500/40",
    text: "text-rose-400",
    glow: "shadow-[0_0_15px_rgba(225,29,72,0.5)]",
    dot: "bg-rose-500",
    bgBadge: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  },
  PUBLISHED: {
    border: "border-cyan-400/40",
    text: "text-cyan-400",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.5)]",
    dot: "bg-cyan-400",
    bgBadge: "bg-cyan-400/20 text-cyan-300 border border-cyan-500/30",
  },
  COUNCIL_TICKET: {
    border: "border-purple-400/40",
    text: "text-purple-400",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
    dot: "bg-purple-400",
    bgBadge: "bg-purple-400/20 text-purple-300 border border-purple-500/30",
  },
  RESOLVED: {
    border: "border-emerald-400/40",
    text: "text-emerald-400",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.5)]",
    dot: "bg-emerald-400",
    bgBadge: "bg-emerald-400/20 text-emerald-300 border border-emerald-500/30",
  },
};

export function PipelineAudit({
  hazard,
  siblings,
  isDrawer = false,
}: {
  hazard: HazardRow;
  siblings: HazardRow[];
  isDrawer?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("trace");
  const [copied, setCopied] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState(hazard.id);
  const [storedTrace, setStoredTrace] = useState(hazard.trace ?? null);
  const { rows } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: siblings.some((row) => row.id === hazard.id) ? siblings : [hazard, ...siblings],
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const activeId = isDrawer ? hazard.id : selectedHazardId;
  const selected = rows.find((row) => row.id === activeId) ?? hazard;
  const trace = useMemo(
    () => parseTrace(storedTrace) ?? parseTrace(selected.trace) ?? inferTrace(selected),
    [storedTrace, selected],
  );

  useEffect(() => {
    setStoredTrace(selected.trace ?? null);
    let cancelled = false;
    void fetch(`/api/hazards/${selected.id}`)
      .then((res) => res.json() as Promise<HazardRow>)
      .then((row) => {
        if (!cancelled && row.trace) setStoredTrace(row.trace);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected.id, selected.trace]);

  const payload = useMemo(() => exportTracePayload(selected, trace), [selected, trace]);
  const events = useMemo(() => eventBusFromTrace(selected, trace), [selected, trace]);
  const jsonText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const checkSteps = trace.steps.filter((step) => step.id !== "aggregator");
  const aggregator = trace.steps.find((step) => step.id === "aggregator");
  const verdictStyle = VERDICT_STYLE[trace.verdict.status] ?? VERDICT_STYLE.NEED_INFO;

  async function copyJson() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadJson() {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trace-${selected.id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- Content Tab Views ---
  const tabContent = (
    <>
      {tab === "trace" ? (
        <div className="flex flex-col gap-4">
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border p-3.5 shadow-sm",
              trace.inferred
                ? "border-amber-500/20 bg-amber-500/10"
                : "border-emerald-500/20 bg-emerald-500/10",
            )}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2
                className={cn("h-4 w-4", trace.inferred ? "text-amber-400" : "text-emerald-400")}
              />
              <span className={cn("text-xs font-bold", trace.inferred ? "text-amber-300" : "text-emerald-400")}>
                {trace.inferred ? "Inferred summary — no stored run" : "Pipeline executed successfully"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              Latency: {trace.inferred ? "—" : `${trace.total_ms}ms`}
            </span>
          </div>

          {/* Citizen Audio Review Section */}
          {selected.audio_url ? (
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-3 shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                  <Headphones className="h-3.5 w-3.5" />
                  Original Citizen Voice Memo
                </span>
                {selected.detected_language && (
                  <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300 border border-cyan-400/30">
                    {selected.detected_language}
                  </span>
                )}
              </div>
              <AudioPlayer
                compact
                src={selected.audio_url}
                title={`Citizen Voice Note #${selected.id.slice(0, 8).toUpperCase()}`}
                language={selected.detected_language}
              />
            </div>
          ) : null}

          <div className="relative ml-4 mt-2">
            <div className="absolute bottom-6 left-[-11px] top-2 w-0.5 bg-slate-700" />
            {checkSteps.map((step) => (
              <TraceNode key={step.id} step={step} />
            ))}
            {aggregator ? (
              <div className="relative flex items-start gap-4">
                <div
                  className={cn(
                    "absolute left-[-19px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-900",
                    verdictStyle.dot,
                    verdictStyle.glow,
                  )}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <div
                  className={cn(
                    "flex-1 rounded-xl border bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-4 shadow-xl",
                    verdictStyle.border,
                  )}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                      <Cpu className="h-3.5 w-3.5 text-slate-300" /> Aggregator Verdict
                    </span>
                    <span className={cn("font-mono text-sm font-extrabold", verdictStyle.text)}>
                      {trace.verdict.confidence_score.toFixed(2)}
                    </span>
                  </div>
                  <h3 className={cn("mb-1.5 text-lg font-black tracking-tight", verdictStyle.text)}>
                    {trace.verdict.status}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-200 font-sans">{aggregator.detail}</p>
                  <p className="mt-2.5 font-mono text-[11px] text-slate-400">
                    Source: {SOURCE_LABEL[trace.verdict.source]} · Latency: {trace.verdict.latency_ms}ms
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "json" ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              application/json · Full Verification Payload
            </span>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="max-h-[500px] overflow-auto rounded-xl border border-slate-700/60 bg-[#0d1117] p-4 font-mono text-[11px] leading-relaxed shadow-inner"
            dangerouslySetInnerHTML={{ __html: colorizeJson(jsonText) }}
          />
        </div>
      ) : null}

      {tab === "bus" ? (
        <div className="flex flex-col gap-3">
          <div className="mb-1 flex items-start gap-3 rounded-xl border border-purple-400/20 bg-purple-400/10 p-3">
            <Server className="mt-0.5 h-4 w-4 text-purple-400" />
            <div>
              <h4 className="text-xs font-bold text-purple-300">Simulated event bus</h4>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-400">
                Topics are derived from the stored pipeline trace & PostgreSQL incident timeline.
              </p>
            </div>
          </div>
          {events.map((event) => (
            <div
              key={`${event.at}-${event.topic}`}
              className={cn("rounded-r-xl border-l-2 bg-[#1e293b] p-3 shadow-sm", TONE[event.tone])}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  {new Date(event.at).toISOString().slice(11, 23)}
                </span>
                <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold", TOPIC[event.tone])}>
                  topic: {event.topic}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-200">{event.message}</p>
            </div>
          ))}
          <p className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <Radio className="h-3.5 w-3.5" /> Derived from hazards.trace — not a live RabbitMQ feed.
          </p>
        </div>
      ) : null}
    </>
  );

  // --- DRAWER MODE RENDERING ---
  if (isDrawer) {
    return (
      <div className="flex h-full w-full flex-col min-h-0 overflow-hidden text-slate-100 bg-slate-950">
        {/* Sticky Drawer Sub-Header */}
        <div className="shrink-0 border-b border-slate-800/80 bg-slate-900/60 px-6 pt-3 pb-3 backdrop-blur-md">
          <div className="mb-2.5 flex items-center justify-between rounded-xl border border-slate-800 bg-[#1e293b]/70 px-3 py-2 shadow-sm">
            <div className="min-w-0 pr-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Incident Trace
              </div>
              <div className="font-mono text-xs font-bold text-cyan-300 truncate">
                #{selected.id.slice(0, 8).toUpperCase()} · {categoryLabel(selected.category)} · {wardShort(selected.ward_id)}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
                verdictStyle.bgBadge,
              )}
            >
              {trace.verdict.status}
            </span>
          </div>

          {/* Tab buttons */}
          <div className="flex rounded-xl bg-slate-800/60 p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-extrabold transition-all",
                  tab === item.id
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-4 pb-8 space-y-4">
          {tabContent}
        </div>

        {/* Solid Pinned Drawer Footer - Never overlaps, never cut off! */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadJson}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-extrabold text-white shadow-lg transition-all hover:border-slate-600 hover:bg-slate-700 active:scale-[0.98]"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>Export Trace Logs</span>
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-extrabold text-slate-300 shadow-lg transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white active:scale-[0.98]"
            >
              <Copy className="h-4 w-4" />
              <span>{copied ? "Copied!" : "Copy JSON"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDALONE PAGE RENDERING ---
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-20 pt-6 text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-16 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -right-20 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />

      <div className="relative z-10 mb-5 flex items-center justify-between">
        <Link
          href="/dashboard/admin/pipeline"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-[#1e293b] text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-white">Pipeline Audit</h1>
          <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-purple-400">
            DEV_ENV · VERCEL
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/20 text-cyan-300">
          <Bug className="h-4 w-4" />
        </div>
      </div>

      <label className="relative z-10 mb-4 block rounded-2xl border border-slate-800 bg-[#1e293b]/90 p-3 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Trace ID
        </div>
        <select
          className="mt-1 w-full bg-transparent font-mono text-sm font-bold text-cyan-300 outline-none"
          value={selected.id}
          onChange={(event) => {
            setSelectedHazardId(event.target.value);
          }}
        >
          {rows.map((row) => (
            <option key={row.id} value={row.id} className="bg-[#1e293b] text-slate-100">
              {row.id.slice(0, 8).toUpperCase()} · {categoryLabel(row.category)} · {wardShort(row.ward_id)}
            </option>
          ))}
        </select>
      </label>

      <div className="relative z-10 mb-5 flex rounded-xl bg-slate-800/50 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-[11px] font-extrabold transition-colors",
              tab === item.id ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-300",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative z-10 flex-1 space-y-4">
        {tabContent}
      </div>

      {/* Sticky Bottom Action Bar for standalone page */}
      <div className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadJson}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-extrabold text-white shadow-lg transition-all hover:bg-slate-700 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span>Export Trace Logs</span>
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-sm font-extrabold text-slate-300 shadow-lg transition-all hover:bg-slate-700 hover:text-white active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />
            <span>{copied ? "Copied!" : "Copy JSON"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TraceNode({ step }: { step: TraceStep }) {
  return (
    <div className="relative mb-5 flex items-start gap-4">
      <div className={cn("absolute left-[-15px] top-1 h-2.5 w-2.5 rounded-full", DOT[step.id])} />
      <div className="flex-1 rounded-xl border border-slate-700/80 bg-[#1e293b] p-3.5 shadow-lg">
        <div className="mb-1 flex items-start justify-between">
          <span
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider",
              step.source === "gemini"
                ? "text-cyan-300"
                : step.source === "code"
                  ? "text-purple-300"
                  : "text-slate-400",
            )}
          >
            {step.name}
          </span>
          <span className="font-mono text-[10px] text-slate-400">{step.latency_ms}ms</span>
        </div>
        <p className="font-mono text-xs font-semibold text-slate-300">
          <span className={step.passed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {step.passed ? "PASS" : "HOLD"}
          </span>
          {" · "}
          <span className="text-slate-400">{SOURCE_LABEL[step.source]}</span>
          {step.confidence != null ? (
            <span className="text-slate-400"> · Conf: {step.confidence.toFixed(2)}</span>
          ) : null}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300 font-sans">{step.detail}</p>
      </div>
    </div>
  );
}

function colorizeJson(json: string) {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (match.startsWith("\"")) {
        return /:$/.test(match)
          ? `<span class="text-cyan-300">${match}</span>`
          : `<span class="text-indigo-300">${match}</span>`;
      }
      if (match === "true" || match === "false") return `<span class="text-amber-300">${match}</span>`;
      if (match === "null") return `<span class="text-slate-500">${match}</span>`;
      return `<span class="text-rose-300">${match}</span>`;
    },
  );
}
