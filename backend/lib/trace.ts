import type { HazardRow, HazardStatus, PipelineTrace, ReportChecks, TraceEvent, TraceStep, Urgency } from "./types";

export async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; latency_ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, latency_ms: Date.now() - start };
}

export function parseTrace(value: unknown): PipelineTrace | null {
  if (!value) return null;
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Partial<PipelineTrace>;
  if (!Array.isArray(row.steps) || typeof row.total_ms !== "number") return null;
  if (!row.started_at || !row.finished_at || !row.checks || !row.verdict) return null;
  return row as PipelineTrace;
}

export function inferTrace(hazard: HazardRow): PipelineTrace {
  const started = Date.parse(hazard.created_at) || Date.now();
  const checks: ReportChecks = {
    image_verified: hazard.confidence_score >= 0.6,
    weather_supported: hazard.ward_id === "ward_01" || hazard.status === "AREA_ALERT",
    cluster_count: Math.max(hazard.confirmations_count, hazard.status === "AREA_ALERT" ? 2 : 0),
    location_matched: hazard.confidence_score >= 0.5,
    risk_level: hazard.urgency,
  };
  const steps: TraceStep[] = [
    {
      id: "image",
      name: "Image AI (Gemini)",
      passed: checks.image_verified,
      detail: checks.image_verified
        ? "Inferred: confidence suggests the photo was accepted."
        : "Inferred: no stored image verdict on this ticket.",
      latency_ms: 0,
      source: "code",
    },
    {
      id: "weather",
      name: "Weather (SYS)",
      passed: checks.weather_supported,
      detail: "Inferred from ward / status — live telemetry was not stored on this ticket.",
      latency_ms: 0,
      source: "code",
    },
    {
      id: "cluster",
      name: "Cluster (PostGIS)",
      passed: checks.cluster_count >= 2,
      detail: `Inferred cluster proxy: ${checks.cluster_count} nearby confirmation(s).`,
      latency_ms: 0,
      source: "code",
      extra: { nearby_count: checks.cluster_count, radius_m: 200 },
    },
    {
      id: "location",
      name: "Location AI (Gemini)",
      passed: checks.location_matched,
      detail: "Inferred from stored coordinates — no live geography call was captured.",
      latency_ms: 0,
      source: "code",
    },
    {
      id: "risk",
      name: "Risk AI (Gemini)",
      passed: hazard.urgency !== "LOW",
      detail: `Inferred severity ${hazard.urgency} from the stored urgency field.`,
      latency_ms: 0,
      source: "code",
    },
    {
      id: "aggregator",
      name: "Aggregator Verdict",
      passed: isActionable(hazard.status),
      detail: hazard.description || "No stored aggregator reasoning on this pre-trace ticket.",
      latency_ms: 0,
      source: "code",
      confidence: hazard.confidence_score,
    },
  ];
  return {
    started_at: new Date(started).toISOString(),
    finished_at: new Date(started).toISOString(),
    total_ms: 0,
    inferred: true,
    steps,
    checks,
    verdict: {
      status: hazard.status,
      urgency: hazard.urgency,
      confidence_score: hazard.confidence_score,
      is_road_blocked: hazard.is_road_blocked,
      reasoning: hazard.description || "No stored aggregator reasoning on this pre-trace ticket.",
      source: "code",
      latency_ms: 0,
    },
  };
}

export function resolveTrace(hazard: HazardRow): PipelineTrace {
  return parseTrace(hazard.trace) ?? inferTrace(hazard);
}

export function eventBusFromTrace(hazard: HazardRow, trace: PipelineTrace): TraceEvent[] {
  const t0 = Date.parse(trace.started_at) || Date.parse(hazard.created_at) || Date.now();
  const checkSteps = trace.steps.filter((step) => step.id !== "aggregator");
  const maxCheckMs = checkSteps.reduce((max, step) => Math.max(max, step.latency_ms), 0);
  const aggregator = trace.steps.find((step) => step.id === "aggregator");
  const verdictAt = t0 + maxCheckMs + (aggregator?.latency_ms ?? trace.verdict.latency_ms);

  const events: TraceEvent[] = [
    {
      at: iso(t0),
      topic: "incident.created",
      message: `Report accepted · ${hazard.category} · ${hazard.ward_id}.`,
      tone: "slate",
    },
  ];

  for (const step of checkSteps) {
    events.push({
      at: iso(t0 + step.latency_ms),
      topic: `check.${step.id}.complete`,
      message: `${step.name} ${step.passed ? "PASS" : "HOLD"} via ${step.source} · ${step.detail}`,
      tone: step.source === "gemini" ? "cyan" : step.source === "code" ? "purple" : "slate",
    });
  }

  events.push({
    at: iso(verdictAt),
    topic: `hazard.${trace.verdict.status.toLowerCase()}`,
    message: `Aggregator ${trace.verdict.source} → ${trace.verdict.status} (${trace.verdict.confidence_score.toFixed(2)}).`,
    tone: statusTone(trace.verdict.status),
  });

  if (trace.verdict.status === "AREA_ALERT") {
    events.push({
      at: iso(verdictAt + 40),
      topic: "notification.broadcast",
      message: `Area-alert fan-out queued for ${hazard.ward_id}.`,
      tone: "crimson",
    });
  }

  if (trace.verdict.status === "COUNCIL_TICKET") {
    events.push({
      at: iso(verdictAt + 40),
      topic: "crew.queue",
      message: "Council ticket opened for field-crew dispatch.",
      tone: "purple",
    });
  }

  events.push({
    at: iso(verdictAt + 90),
    topic: "analytics.sync",
    message: "Trace persisted on hazards.trace · realtime subscribers notified.",
    tone: "slate",
  });

  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function isActionable(status: HazardStatus) {
  return status === "PUBLISHED" || status === "AREA_ALERT" || status === "COUNCIL_TICKET";
}

function statusTone(status: HazardStatus): TraceEvent["tone"] {
  if (status === "AREA_ALERT") return "crimson";
  if (status === "PUBLISHED") return "cyan";
  if (status === "COUNCIL_TICKET") return "purple";
  if (status === "NEED_INFO" || status === "PENDING") return "amber";
  return "emerald";
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function exportTracePayload(hazard: HazardRow, trace: PipelineTrace) {
  return {
    incident_id: hazard.id,
    timestamp: trace.started_at,
    inferred: Boolean(trace.inferred),
    pipeline_results: Object.fromEntries(
      trace.steps
        .filter((step) => step.id !== "aggregator")
        .map((step) => [
          step.id,
          {
            passed: step.passed,
            detail: step.detail,
            latency_ms: step.latency_ms,
            source: step.source,
            confidence: step.confidence,
            extra: step.extra,
          },
        ]),
    ),
    aggregator_output: {
      final_confidence: trace.verdict.confidence_score,
      outcome: trace.verdict.status,
      urgency: trace.verdict.urgency,
      is_road_blocked: trace.verdict.is_road_blocked,
      reasoning: trace.verdict.reasoning,
      source: trace.verdict.source,
      latency_ms: trace.verdict.latency_ms,
    },
    checks: trace.checks,
    processing_time_ms: trace.total_ms,
    events: eventBusFromTrace(hazard, trace),
  };
}

export function riskPassed(level: Urgency) {
  return level !== "LOW";
}
