import { getAiSettings } from "./db";
import { callGeminiJsonSafe } from "./gemini";
import type {
  AiSettings,
  CheckSource,
  HazardStatus,
  ReportChecks,
  ReportRequest,
  ReportResponse,
  Urgency,
} from "./types";

const STATUS_VALUES: HazardStatus[] = [
  "PENDING",
  "PUBLISHED",
  "NEED_INFO",
  "AREA_ALERT",
  "COUNCIL_TICKET",
];

const AGGREGATOR_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: STATUS_VALUES },
    urgency: { type: "STRING", enum: ["LOW", "MEDIUM", "CRITICAL"] },
    confidence_score: {
      type: "NUMBER",
      description: "0 to 1 confidence that this is a genuine, actionable hazard.",
    },
    is_road_blocked: { type: "BOOLEAN" },
    reasoning: { type: "STRING", description: "One or two sentences a council officer will read." },
  },
  required: ["status", "urgency", "confidence_score", "is_road_blocked", "reasoning"],
};

type AggregatorVerdict = Pick<
  ReportResponse,
  "status" | "urgency" | "confidence_score" | "is_road_blocked" | "reasoning"
> & { source: CheckSource };

/**
 * Deterministic outcome used whenever Gemini is mocked, disabled, or fails —
 * this is also the aggregation logic the AI aggregator is instructed to
 * approximate, so the demo stays coherent whichever path runs.
 */
export function deterministicAggregate(
  body: ReportRequest,
  checks: ReportChecks,
  settings: AiSettings,
): AggregatorVerdict {
  const help = body.help_request || body.category === "HELP_REQUEST";

  if (help) {
    return {
      status: "NEED_INFO",
      urgency: "MEDIUM",
      confidence_score: 0.44,
      is_road_blocked: false,
      reasoning:
        "Help request captured. Relief desk can match it to a shelter with free beds.",
      source: "code",
    };
  }

  const isImpassable =
    checks.passability === "IMPASSABLE" ||
    checks.passability === "EXTREME_BOAT_ONLY" ||
    (typeof checks.estimated_water_depth_cm === "number" && checks.estimated_water_depth_cm >= 35);

  const isExtremeDepth =
    checks.passability === "EXTREME_BOAT_ONLY" ||
    (typeof checks.estimated_water_depth_cm === "number" && checks.estimated_water_depth_cm >= 50);

  if (body.category === "FLOOD" && checks.weather_supported && checks.cluster_count >= 2) {
    return {
      status: "AREA_ALERT",
      urgency: "CRITICAL",
      confidence_score: 0.89,
      is_road_blocked: true,
      reasoning: `Severe flooding verified by computer vision (depth ~${checks.estimated_water_depth_cm ?? 45}cm, ${checks.passability ?? "IMPASSABLE"}), reinforced by rainfall telemetry and ${checks.cluster_count} local cluster reports.`,
      source: "code",
    };
  }

  if (checks.weather_supported && checks.image_verified) {
    const isWater = body.category === "FLOOD" || body.category === "DRAINAGE_OVERFLOW";
    const depthDetail = isWater && typeof checks.estimated_water_depth_cm === "number" && checks.estimated_water_depth_cm > 0
      ? ` with water depth ~${checks.estimated_water_depth_cm}cm (${checks.passability ?? "CAUTION_SUV_ONLY"})`
      : "";
    return {
      status: "PUBLISHED",
      urgency: isExtremeDepth ? "CRITICAL" : checks.risk_level,
      confidence_score: 0.76,
      is_road_blocked: isImpassable || body.category !== "HELP_REQUEST",
      reasoning: `Image verified for ${body.category}${depthDetail}. Pin published on public map.`,
      source: "code",
    };
  }

  if (checks.image_verified && checks.location_matched) {
    const isActionable =
      isImpassable ||
      body.category === "BLOCKED_ROAD" ||
      body.category === "FALLEN_TREE" ||
      body.category === "ELECTRICAL_HAZARD" ||
      body.category === "LANDSLIDE" ||
      body.category === "DRAINAGE_OVERFLOW" ||
      body.category === "STRUCTURAL_DAMAGE";
    const isWater = body.category === "FLOOD" || body.category === "DRAINAGE_OVERFLOW";
    return {
      status: "COUNCIL_TICKET",
      urgency: isExtremeDepth ? "CRITICAL" : "MEDIUM",
      confidence_score: 0.68,
      is_road_blocked: isActionable,
      reasoning:
        isWater && checks.estimated_water_depth_cm && checks.estimated_water_depth_cm > 20
          ? `Actionable hazard with water depth ~${checks.estimated_water_depth_cm}cm (${checks.passability}). Raised as council ticket for squad dispatch.`
          : `Actionable ${body.category} with a verified photo and plausible location. Raised as a council ticket for field dispatch.`,
      source: "code",
    };
  }

  const hasPhoto = Boolean(body.photo_base64);
  const heldConfidence = hasPhoto && !checks.image_verified ? 0.2 : 0.44;
  const status: HazardStatus =
    heldConfidence >= settings.confirm_threshold ? "PUBLISHED" : "NEED_INFO";
  return {
    status,
    urgency: isExtremeDepth ? "CRITICAL" : checks.risk_level,
    confidence_score: heldConfidence,
    is_road_blocked: isImpassable,
    reasoning:
      hasPhoto && !checks.image_verified
        ? "Attached image could not be verified as an authentic disaster scene. Held as NEED_INFO for officer verification."
        : "Checks are mixed or inconclusive. Holding as NEED_INFO until nearby users confirm.",
    source: "code",
  };
}

/**
 * Aggregator — single Gemini call that reads the current ai_settings
 * thresholds plus all five check outputs and returns the final verdict.
 * Falls back to the deterministic aggregator on any AI failure/timeout so a
 * flaky network never breaks the demo.
 */
export async function aggregate(
  body: ReportRequest,
  checks: ReportChecks,
): Promise<AggregatorVerdict> {
  const settings = await getAiSettings();
  const fallback = () => deterministicAggregate(body, checks, settings);

  const help = body.help_request || body.category === "HELP_REQUEST";
  if (help) {
    // Help requests always route to relief triage — no need to spend an AI call.
    return fallback();
  }

  const prompt = `You are the aggregator step of a disaster-response report pipeline for Colombo, Sri Lanka.
Combine these five independent check outputs into one verdict. Do not re-derive the checks — trust them as given.

Report:
- category: ${body.category}
- description: ${body.description || "(none provided)"}
- ward_id: ${body.ward_id}

Checks:
- image_verified (AI): ${checks.image_verified}
- weather_supported (rainfall/river telemetry, plain code): ${checks.weather_supported}
- cluster_count (nearby reports in last 3h within 200m, plain code): ${checks.cluster_count}
- location_matched (AI): ${checks.location_matched}
- risk_level (AI severity grade): ${checks.risk_level}

Current tuning thresholds:
- confirm_threshold: ${settings.confirm_threshold} (confidence at/above this can auto-publish)
- reject_threshold: ${settings.reject_threshold} (confidence at/below this should be rejected/held)

Decide one status from PENDING, PUBLISHED, NEED_INFO, AREA_ALERT, COUNCIL_TICKET:
- AREA_ALERT: category is FLOOD, weather_supported is true, and cluster_count >= 2 — a confirmed area-wide event.
- PUBLISHED: image_verified and location_matched are both true and confidence is at/above confirm_threshold. Never publish if image_verified is false!
- COUNCIL_TICKET: image_verified is true but this is a routine actionable hazard (e.g. BLOCKED_ROAD, FALLEN_TREE) needing field dispatch rather than a public alert.
- NEED_INFO: checks conflict, image_verified is false, or confidence is below confirm_threshold — hold for crowdsourced confirmation or officer review.
- PENDING: image_verified is false and risk_level is LOW — likely not a real hazard or spam/meme image.

Pick urgency from LOW, MEDIUM, CRITICAL consistent with risk_level and the chosen status.
Set is_road_blocked true only if the category and checks indicate the road is actually impassable.
Set confidence_score between 0 and 1 reflecting how sure you are this is a genuine, actionable hazard. If image_verified is false, confidence must be low (< 0.3).
Write one or two sentences of reasoning a council officer will read on their queue. Do NOT mention water depth unless the category is FLOOD or DRAINAGE_OVERFLOW.

Respond only with JSON matching the schema.`;

  const { value, source } = await callGeminiJsonSafe<{
    status: HazardStatus;
    urgency: Urgency;
    confidence_score: number;
    is_road_blocked: boolean;
    reasoning: string;
  }>(prompt, AGGREGATOR_SCHEMA, fallback);

  return { ...value, source };
}
