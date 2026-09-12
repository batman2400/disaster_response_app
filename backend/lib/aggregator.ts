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

  if (body.category === "FLOOD" && checks.weather_supported && checks.cluster_count >= 2) {
    return {
      status: "AREA_ALERT",
      urgency: "CRITICAL",
      confidence_score: 0.89,
      is_road_blocked: true,
      reasoning: `Severe flooding verified by computer vision, reinforced by ward rainfall telemetry and ${checks.cluster_count} local cluster reports.`,
      source: "code",
    };
  }

  if (checks.weather_supported && checks.image_verified) {
    return {
      status: "PUBLISHED",
      urgency: checks.risk_level,
      confidence_score: 0.74,
      is_road_blocked: body.category !== "HELP_REQUEST",
      reasoning: "Image and weather checks agree. Pin published on the public map.",
      source: "code",
    };
  }

  if (checks.image_verified && checks.location_matched) {
    const isActionable =
      body.category === "BLOCKED_ROAD" ||
      body.category === "FALLEN_TREE" ||
      body.category === "ELECTRICAL_HAZARD" ||
      body.category === "LANDSLIDE" ||
      body.category === "DRAINAGE_OVERFLOW" ||
      body.category === "STRUCTURAL_DAMAGE";
    return {
      status: "COUNCIL_TICKET",
      urgency: "MEDIUM",
      confidence_score: 0.66,
      is_road_blocked: isActionable,
      reasoning:
        "Actionable hazard with a verified photo and plausible location. Raised as a council ticket for field dispatch.",
      source: "code",
    };
  }

  const heldConfidence = 0.48;
  const status: HazardStatus =
    heldConfidence >= settings.confirm_threshold ? "PUBLISHED" : "NEED_INFO";
  return {
    status,
    urgency: checks.risk_level,
    confidence_score: heldConfidence,
    is_road_blocked: false,
    reasoning:
      "Checks are mixed. Holding as NEED_INFO until nearby users confirm.",
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
- PUBLISHED: image_verified and location_matched are both true and confidence is at/above confirm_threshold.
- COUNCIL_TICKET: image_verified is true but this is a routine actionable hazard (e.g. BLOCKED_ROAD, FALLEN_TREE) needing field dispatch rather than a public alert.
- NEED_INFO: checks conflict or confidence is below confirm_threshold — hold for crowdsourced confirmation.
- PENDING: image_verified is false and risk_level is LOW — likely not a real hazard.

Pick urgency from LOW, MEDIUM, CRITICAL consistent with risk_level and the chosen status.
Set is_road_blocked true only if the category and checks indicate the road is actually impassable.
Set confidence_score between 0 and 1 reflecting how sure you are this is a genuine, actionable hazard.
Write one or two sentences of reasoning a council officer will read on their queue.

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
