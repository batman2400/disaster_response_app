import { aggregate } from "./aggregator";
import { checkCluster, CLUSTER_RADIUS_M, CLUSTER_WINDOW_HOURS } from "./checks/cluster";
import { checkImage } from "./checks/image";
import { checkLocation } from "./checks/location";
import { checkRisk } from "./checks/risk";
import { checkWeather } from "./checks/weather";
import { summarizeCitizenInput } from "./checks/input-summary";
import { getAiSettings, saveAiSettings, saveHazard, uploadAudio, uploadPhoto } from "./db";
import { geminiModel } from "./gemini";
import { riskPassed, timed } from "./trace";
import type { HazardRow, PipelineTrace, ReportChecks, ReportRequest, ReportResponse, TraceStep } from "./types";

/**
 * Runs the independent checks concurrently (per the pipeline diagram):
 * image + location + risk + input summary via Gemini, weather + cluster as plain code.
 * Each AI check falls back to a deterministic result if Gemini is mocked or unavailable.
 */
export async function runChecks(body: ReportRequest): Promise<ReportChecks> {
  const { checks } = await runTracedChecks(body);
  return checks;
}

async function runTracedChecks(body: ReportRequest) {
  const [image, weather, cluster, location, risk, summaryRes] = await Promise.all([
    timed(() => checkImage(body.photo_base64, body.category, body.description)),
    timed(() => checkWeather(body.ward_id)),
    timed(() => checkCluster(body.lat, body.lng)),
    timed(() => checkLocation(body.lat, body.lng, body.ward_id, body.description)),
    timed(() => checkRisk(body.category, body.description, body.photo_base64)),
    timed(() =>
      summarizeCitizenInput({
        description: body.description,
        category: body.category,
        audioBase64: body.audio_base64,
        audioMime: body.audio_mime,
      }),
    ),
  ]);

  const checks: ReportChecks = {
    image_verified: image.value.image_verified,
    weather_supported: weather.value.weather_supported,
    cluster_count: cluster.value.cluster_count,
    location_matched: location.value.location_matched,
    risk_level: risk.value.risk_level,
  };

  const model = geminiModel();
  const steps: TraceStep[] = [
    {
      id: "summary",
      name: "Input & Multilingual AI",
      passed: Boolean(summaryRes.value.summary),
      detail: `[${summaryRes.value.detected_language}] ${summaryRes.value.summary}`,
      latency_ms: summaryRes.latency_ms,
      source: summaryRes.value.source,
      extra: {
        detected_language: summaryRes.value.detected_language,
        landmarks: summaryRes.value.extracted_landmarks,
      },
    },
    {
      id: "image",
      name: "Image AI (Gemini)",
      passed: image.value.image_verified,
      detail: image.value.reason,
      latency_ms: image.latency_ms,
      source: image.value.source,
      extra: image.value.source === "gemini" ? { model_version: model } : undefined,
    },
    {
      id: "weather",
      name: "Weather (SYS)",
      passed: weather.value.weather_supported,
      detail: weather.value.detail,
      latency_ms: weather.latency_ms,
      source: weather.value.source,
      extra: {
        local_rain_mm: weather.value.rainfall_mm,
        river_level_pct: weather.value.river_level_pct,
      },
    },
    {
      id: "cluster",
      name: "Cluster (PostGIS)",
      passed: cluster.value.cluster_count >= 2,
      detail: cluster.value.detail,
      latency_ms: cluster.latency_ms,
      source: cluster.value.source,
      extra: {
        nearby_count: cluster.value.cluster_count,
        radius_m: CLUSTER_RADIUS_M,
        window_hours: CLUSTER_WINDOW_HOURS,
      },
    },
    {
      id: "location",
      name: "Location AI (Gemini)",
      passed: location.value.location_matched,
      detail: location.value.reason,
      latency_ms: location.latency_ms,
      source: location.value.source,
      extra: location.value.source === "gemini" ? { model_version: model } : undefined,
    },
    {
      id: "risk",
      name: "Risk AI (Gemini)",
      passed: riskPassed(risk.value.risk_level),
      detail: `${risk.value.risk_level} — ${risk.value.reason}`,
      latency_ms: risk.latency_ms,
      source: risk.value.source,
      extra: { risk_level: risk.value.risk_level },
    },
  ];

  return {
    checks,
    steps,
    summary: summaryRes.value.summary,
    detected_language: summaryRes.value.detected_language,
  };
}

/** Runs checks + aggregator and returns the locked response shape (minus incident_id). */
export async function buildVerdict(
  body: ReportRequest,
): Promise<Omit<ReportResponse, "incident_id">> {
  const started = Date.now();
  const started_at = new Date(started).toISOString();
  const { checks, steps, summary, detected_language } = await runTracedChecks(body);
  const { value: verdict, latency_ms } = await timed(async () => {
    const result = await aggregate(body, checks);
    return result;
  });

  const aggregatorStep: TraceStep = {
    id: "aggregator",
    name: "Aggregator Verdict",
    passed:
      verdict.status === "PUBLISHED" ||
      verdict.status === "AREA_ALERT" ||
      verdict.status === "COUNCIL_TICKET",
    detail: verdict.reasoning,
    latency_ms,
    source: verdict.source,
    confidence: verdict.confidence_score,
    extra: verdict.source === "gemini" ? { model_version: geminiModel() } : undefined,
  };

  const finished = Date.now();
  const { source: _source, ...publicVerdict } = verdict;
  const trace: PipelineTrace = {
    started_at,
    finished_at: new Date(finished).toISOString(),
    total_ms: finished - started,
    steps: [...steps, aggregatorStep],
    checks,
    verdict: {
      ...publicVerdict,
      source: verdict.source,
      latency_ms,
    },
  };

  return { ...publicVerdict, checks, trace, summary, detected_language };
}

export async function persistReport(body: ReportRequest, result: ReportResponse) {
  const photo_url = body.photo_base64
    ? await uploadPhoto(result.incident_id, body.photo_base64, "report")
    : null;
  const audio_url = body.audio_base64
    ? await uploadAudio(result.incident_id, body.audio_base64, body.audio_mime || "audio/webm")
    : null;
  const row: HazardRow = {
    id: result.incident_id,
    lat: body.lat,
    lng: body.lng,
    ward_id: body.ward_id,
    category: body.help_request ? "HELP_REQUEST" : body.category,
    description: body.description,
    photo_url,
    audio_url,
    status: result.status,
    urgency: result.urgency,
    confidence_score: result.confidence_score,
    is_road_blocked: result.is_road_blocked,
    confirmations_count: 0,
    created_at: new Date().toISOString(),
    resolved_at: null,
    closure_photo_url: null,
    trace: result.trace ?? null,
    summary: result.summary ?? null,
    detected_language: result.detected_language ?? null,
  };
  return saveHazard(row);
}

export async function nudgeThresholds(
  previous: HazardRow["status"],
  next: HazardRow["status"],
  incidentId?: string,
) {
  const settings = await getAiSettings();
  const oldConfirm = settings.confirm_threshold;
  const published = new Set(["PUBLISHED", "AREA_ALERT", "COUNCIL_TICKET"]);
  const wasPublished = published.has(previous);
  const nowPublished = published.has(next);
  if (!wasPublished && nowPublished) {
    settings.confirm_threshold = Math.max(0.45, Number((settings.confirm_threshold - 0.02).toFixed(2)));
  }
  if (wasPublished && !nowPublished) {
    settings.confirm_threshold = Math.min(0.85, Number((settings.confirm_threshold + 0.02).toFixed(2)));
  }
  
  if (oldConfirm !== settings.confirm_threshold) {
    const { recordRetuneLog } = await import("./admin");
    await recordRetuneLog({
      trigger: "OFFICER_OVERRIDE",
      incident_id: incidentId,
      previous_confirm: oldConfirm,
      new_confirm: settings.confirm_threshold,
      previous_reject: settings.reject_threshold,
      new_reject: settings.reject_threshold,
      note: `Officer changed status ${previous} → ${next}. Retuned confirm threshold ${oldConfirm} → ${settings.confirm_threshold} (${oldConfirm > settings.confirm_threshold ? "-0.02 sensitivity boost" : "+0.02 strictness increase"}).`,
    }).catch(() => {});
  }
  
  return saveAiSettings(settings);
}
