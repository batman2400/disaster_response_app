import { aggregate } from "./aggregator";
import { checkCluster } from "./checks/cluster";
import { checkImage } from "./checks/image";
import { checkLocation } from "./checks/location";
import { checkRisk } from "./checks/risk";
import { checkWeather } from "./checks/weather";
import { getAiSettings, saveAiSettings, saveHazard, uploadPhoto } from "./db";
import type { HazardRow, ReportChecks, ReportRequest, ReportResponse } from "./types";

/**
 * Runs the five independent checks concurrently (per the locked pipeline
 * diagram): image + location + risk via Gemini, weather + cluster as plain
 * code. Each AI check already falls back to a deterministic result on its
 * own if Gemini is mocked, slow, or unavailable.
 */
export async function runChecks(body: ReportRequest): Promise<ReportChecks> {
  const [image, weather_supported, cluster_count, location, risk] = await Promise.all([
    checkImage(body.photo_base64, body.category, body.description),
    checkWeather(body.ward_id),
    checkCluster(body.lat, body.lng),
    checkLocation(body.lat, body.lng, body.ward_id, body.description),
    checkRisk(body.category, body.description, body.photo_base64),
  ]);

  return {
    image_verified: image.image_verified,
    weather_supported,
    cluster_count,
    location_matched: location.location_matched,
    risk_level: risk.risk_level,
  };
}

/** Runs checks + aggregator and returns the locked response shape (minus incident_id). */
export async function buildVerdict(
  body: ReportRequest,
): Promise<Omit<ReportResponse, "incident_id">> {
  const checks = await runChecks(body);
  const verdict = await aggregate(body, checks);
  return { ...verdict, checks };
}

export async function persistReport(body: ReportRequest, result: ReportResponse) {
  const photo_url = body.photo_base64
    ? await uploadPhoto(result.incident_id, body.photo_base64, "report")
    : null;
  const row: HazardRow = {
    id: result.incident_id,
    lat: body.lat,
    lng: body.lng,
    ward_id: body.ward_id,
    category: body.help_request ? "HELP_REQUEST" : body.category,
    description: body.description,
    photo_url,
    status: result.status,
    urgency: result.urgency,
    confidence_score: result.confidence_score,
    is_road_blocked: result.is_road_blocked,
    confirmations_count: 0,
    created_at: new Date().toISOString(),
    resolved_at: null,
    closure_photo_url: null,
  };
  return saveHazard(row);
}

export async function nudgeThresholds(
  previous: HazardRow["status"],
  next: HazardRow["status"],
) {
  const settings = await getAiSettings();
  const published = new Set(["PUBLISHED", "AREA_ALERT", "COUNCIL_TICKET"]);
  const wasPublished = published.has(previous);
  const nowPublished = published.has(next);
  if (!wasPublished && nowPublished) {
    settings.confirm_threshold = Math.max(0.45, settings.confirm_threshold - 0.02);
  }
  if (wasPublished && !nowPublished) {
    settings.confirm_threshold = Math.min(0.85, settings.confirm_threshold + 0.02);
  }
  return saveAiSettings(settings);
}
