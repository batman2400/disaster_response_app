import { clusterCount, getAiSettings, listWards, saveAiSettings, saveHazard, uploadPhoto } from "./db";
import type {
  HazardRow,
  ReportChecks,
  ReportRequest,
  ReportResponse,
  Urgency,
} from "./types";

export async function runWeatherCheck(wardId: ReportRequest["ward_id"]) {
  const wards = await listWards();
  const ward = wards.find((item) => item.id === wardId);
  if (!ward) return false;
  return ward.rainfall_mm > 40.0 || ward.river_level_pct > 75.0;
}

export async function stubChecks(body: ReportRequest): Promise<ReportChecks> {
  const [weather_supported, cluster_count] = await Promise.all([
    runWeatherCheck(body.ward_id),
    clusterCount(body.lat, body.lng),
  ]);
  const risk_level: Urgency = weather_supported
    ? cluster_count >= 2
      ? "CRITICAL"
      : "MEDIUM"
    : "LOW";

  return {
    image_verified: Boolean(body.photo_base64),
    weather_supported,
    cluster_count,
    location_matched: Boolean(body.photo_base64) && body.lat > 6 && body.lng > 79,
    risk_level,
  };
}

export async function stubAggregate(
  body: ReportRequest,
  checks: ReportChecks,
): Promise<Omit<ReportResponse, "incident_id">> {
  const settings = await getAiSettings();
  const help = body.help_request || body.category === "HELP_REQUEST";
  let status: ReportResponse["status"] = "NEED_INFO";
  let urgency: Urgency = checks.risk_level;
  let confidence_score = 0.48;
  let is_road_blocked = false;
  let reasoning =
    "Checks are mixed. Holding as NEED_INFO until nearby users confirm.";

  if (help) {
    status = "NEED_INFO";
    urgency = "MEDIUM";
    confidence_score = 0.44;
    reasoning =
      "Help request captured. Relief desk can match it to a shelter with free beds.";
  } else if (
    body.category === "FLOOD" &&
    checks.weather_supported &&
    checks.cluster_count >= 2
  ) {
    status = "AREA_ALERT";
    urgency = "CRITICAL";
    confidence_score = 0.89;
    is_road_blocked = true;
    reasoning = `Severe flooding verified by computer vision, reinforced by ward rainfall telemetry and ${checks.cluster_count} local cluster reports.`;
  } else if (checks.weather_supported && checks.image_verified) {
    status = "PUBLISHED";
    urgency = checks.risk_level;
    confidence_score = 0.74;
    is_road_blocked = body.category !== "HELP_REQUEST";
    reasoning =
      "Image and weather checks agree. Pin published on the public map.";
  } else if (checks.image_verified) {
    status = "COUNCIL_TICKET";
    urgency = "MEDIUM";
    confidence_score = 0.66;
    is_road_blocked =
      body.category === "BLOCKED_ROAD" || body.category === "FALLEN_TREE";
    reasoning =
      "Actionable hazard with a photo. Raised as a council ticket for field dispatch.";
  }

  if (confidence_score >= settings.confirm_threshold && status === "NEED_INFO") {
    status = "PUBLISHED";
  }

  return { status, urgency, confidence_score, is_road_blocked, checks, reasoning };
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
