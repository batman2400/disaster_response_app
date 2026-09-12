import { listWards } from "../db";
import { callGeminiJsonSafe } from "../gemini";
import type { CheckSource, WardId } from "../types";

const LOCATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    within_colombo: {
      type: "BOOLEAN",
      description: "True if the coordinates fall within Greater Colombo, Sri Lanka.",
    },
    matches_ward: {
      type: "BOOLEAN",
      description: "True if the coordinates and any mentioned landmarks are plausibly inside or near the named ward.",
    },
    landmarks_identified: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Roads, bridges, temples, or junctions identified from citizen description.",
    },
    reason: { type: "STRING", description: "One short sentence explaining the verdict." },
  },
  required: ["within_colombo", "matches_ward", "reason"],
};

export interface LocationCheckResult {
  location_matched: boolean;
  reason: string;
  landmarks?: string[];
  source: CheckSource;
}

// Greater Colombo bounding box — cheap sanity check before spending an AI call.
const COLOMBO_BOUNDS = { minLat: 6.8, maxLat: 7.05, minLng: 79.78, maxLng: 79.95 };

function withinColomboBounds(lat: number, lng: number) {
  return (
    lat >= COLOMBO_BOUNDS.minLat &&
    lat <= COLOMBO_BOUNDS.maxLat &&
    lng >= COLOMBO_BOUNDS.minLng &&
    lng <= COLOMBO_BOUNDS.maxLng
  );
}

async function wardName(wardId: WardId) {
  const wards = await listWards();
  return wards.find((ward) => ward.id === wardId)?.name ?? wardId;
}

/**
 * Check 4 — Location (AI). Cross-checks the reported GPS point against the
 * chosen ward and description using Gemini's knowledge of Colombo geography
 * and landmark identification.
 * Falls back to bounding-box check if AI is unavailable.
 */
export async function checkLocation(
  lat: number,
  lng: number,
  wardId: WardId,
  description: string,
): Promise<LocationCheckResult> {
  const boundsOk = withinColomboBounds(lat, lng);
  if (!boundsOk) {
    return { location_matched: false, reason: "Coordinates fall outside Greater Colombo.", source: "code" };
  }

  const prompt = `You are a geography and urban landmark plausibility checker for Colombo, Sri Lanka.

Reported ward: ${wardId} — ${await wardName(wardId)}
Reported coordinates: lat ${lat}, lng ${lng}
Citizen description: ${description || "(none provided)"}

Decide:
1. Are these coordinates within Greater Colombo?
2. Are any specific landmarks, bridges (e.g. Kelani Bridge, Victoria Bridge, Nagalagam St), temples, junctions, or roads mentioned in the text?
3. Does the text and location plausibly align with the named ward (allowing slack for citizen GPS drift)?

Respond only with JSON matching the schema.`;

  const { value, source } = await callGeminiJsonSafe<{
    within_colombo: boolean;
    matches_ward: boolean;
    landmarks_identified?: string[];
    reason: string;
  }>(prompt, LOCATION_SCHEMA, () => ({
    within_colombo: true,
    matches_ward: true,
    landmarks_identified: [],
    reason: "Fallback: within Colombo bounding box, AI verification unavailable.",
  }));

  return {
    location_matched: value.within_colombo && value.matches_ward,
    reason: value.reason,
    landmarks: value.landmarks_identified,
    source,
  };
}
