"use client";

import { ArrowLeft, Bug, CheckCircle2, Copy, Cpu, Download, Radio, Server } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { categoryLabel, wardShort } from "@/lib/format";
import { inferTrace, parseTrace, eventBusFromTrace, exportTracePayload } from "@/lib/trace";
import type { CheckSource, HazardRow, TraceEventTone, TraceStep } from "@/lib/types";
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
  image: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]",
  weather: "bg-slate-400",
  cluster: "bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]",
  location: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]",
  risk: "bg-amber-400",
  aggregator: "bg-rose-500 shadow-[0_0_14px_rgba(225,29,72,0.6)]",
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

export function PipelineAudit({
  hazard,
  siblings,
}: {
  hazard: HazardRow;
  siblings: HazardRow[];
}) {
  const [tab, setTab] = useState<TabId>("trace");
  const [copied, setCopied] = useState(false);
  const [storedTrace, setStoredTrace] = useState(hazard.trace ?? null);
  const { rows } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: siblings.some((row) => row.id === hazard.id) ? siblings : [hazard, ...siblings],
    mapRow: mapHazardRow,
    sort: sortHazards,
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const selected = rows.find((row) => row.id === hazard.id) ?? hazard;
  const trace = useMemo(
    () => parseTrace(storedTrace) ?? parseTrace(selected.trace) ?? inferTrace(selected),
    [storedTrace, selected],
  );

  useEffect(() => {
    setStoredTrace(hazard.trace ?? null);
    let cancelled = false;
    void fetch(`/api/hazards/${hazard.id}`)
      .then((res) => res.json() as Promise<HazardRow>)
      .then((row) => {
        if (!cancelled && row.trace) setStoredTrace(row.trace);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hazard.id, hazard.trace]);
  const payload = useMemo(() => exportTracePayload(selected, trace), [selected, trace]);
  const events = useMemo(() => eventBusFromTrace(selected, trace), [selected, trace]);
  const jsonText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const checkSteps = trace.steps.filter((step) => step.id !== "aggregator");
  const aggregator = trace.steps.find((step) => step.id === "aggregator");

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

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-28 pt-6">
      <div className="pointer-events-none absolute -left-24 -top-16 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -right-20 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />

      <div className="relative z-10 mb-5 flex items-center justify-between">
        <Link
          href="/dashboard/admin/pipeline"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-[#1e293b] text-slate-400"
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

      <label className="relative z-10 mb-4 block rounded-2xl border border-slate-700 bg-[#1e293b]/90 p-3 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trace ID</div>
        <select
          className="mt-1 w-full bg-transparent font-mono text-sm font-bold text-cyan-300 outline-none"
          value={selected.id}
          onChange={(event) => {
            window.location.href = `/dashboard/admin/pipeline/${event.target.value}`;
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
              tab === item.id ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative z-10 flex-1">
        {tab === "trace" ? (
          <div className="flex flex-col gap-4">
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-3",
                trace.inferred
                  ? "border-amber-500/20 bg-amber-500/10"
                  : "border-emerald-500/20 bg-emerald-500/10",
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={cn("h-4 w-4", trace.inferred ? "text-amber-400" : "text-emerald-400")}
                />
                <span className={cn("text-xs font-bold", trace.inferred ? "text-amber-300" : "text-emerald-400")}>
                  {trace.inferred ? "Inferred summary — no stored run" : "Pipeline executed"}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Latency: {trace.inferred ? "—" : `${trace.total_ms}ms`}
              </span>
            </div>

            <div className="relative ml-4 mt-1">
              <div className="absolute bottom-6 left-[-11px] top-2 w-0.5 bg-slate-700" />
              {checkSteps.map((step) => (
                <TraceNode key={step.id} step={step} />
              ))}
              {aggregator ? (
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-[-19px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0f172a] bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                  <div className="flex-1 rounded-xl border border-rose-500/30 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-lg">
                    <div className="mb-2 flex items-start justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                        <Cpu className="h-3 w-3" /> Aggregator Verdict
                      </span>
                      <span className="font-mono text-sm font-bold text-rose-400">
                        {trace.verdict.confidence_score.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="mb-1 text-lg font-black tracking-tight text-rose-400">
                      {trace.verdict.status}
                    </h3>
                    <p className="font-mono text-[10px] leading-relaxed text-slate-400">{aggregator.detail}</p>
                    <p className="mt-2 font-mono text-[10px] text-slate-500">
                      {SOURCE_LABEL[trace.verdict.source]} · {trace.verdict.latency_ms}ms
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                application/json
              </span>
              <button
                type="button"
                onClick={() => void copyJson()}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-white"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="h-[480px] overflow-auto rounded-xl border border-slate-700/50 bg-[#0d1117] p-4 font-mono text-[10px] leading-relaxed shadow-inner"
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
                <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                  No broker in this stack. Topics are derived from the stored pipeline trace.
                </p>
              </div>
            </div>
            {events.map((event) => (
              <div
                key={`${event.at}-${event.topic}`}
                className={cn("rounded-r-xl border-l-2 bg-[#1e293b] p-3 shadow-sm", TONE[event.tone])}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold text-slate-500">
                    {new Date(event.at).toISOString().slice(11, 23)}
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", TOPIC[event.tone])}>
                    topic: {event.topic}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-300">{event.message}</p>
              </div>
            ))}
            <p className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
              <Radio className="h-3 w-3" /> Derived from hazards.trace — not a live RabbitMQ feed.
            </p>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent p-6">
        <button
          type="button"
          onClick={downloadJson}
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-800 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          Export Trace Logs
        </button>
      </div>
    </div>
  );
}

function TraceNode({ step }: { step: TraceStep }) {
  return (
    <div className="relative mb-6 flex items-start gap-4">
      <div className={cn("absolute left-[-15px] top-1 h-2.5 w-2.5 rounded-full", DOT[step.id])} />
      <div className="flex-1 rounded-xl border border-slate-700 bg-[#1e293b] p-3 shadow-lg">
        <div className="mb-1 flex items-start justify-between">
          <span
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider",
              step.source === "gemini" ? "text-cyan-300" : step.source === "code" ? "text-purple-300" : "text-slate-400",
            )}
          >
            {step.name}
          </span>
          <span className="font-mono text-[9px] text-slate-500">{step.latency_ms}ms</span>
        </div>
        <p className="font-mono text-xs text-slate-300">
          <span className={step.passed ? "text-emerald-400" : "text-amber-300"}>
            {step.passed ? "PASS" : "HOLD"}
          </span>
          {" · "}
          {SOURCE_LABEL[step.source]}
          {step.confidence != null ? ` · Conf: ${step.confidence.toFixed(2)}` : null}
        </p>
        <p className="mt-1 text-[10px] leading-tight text-slate-500">{step.detail}</p>
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
