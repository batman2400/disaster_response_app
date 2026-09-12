import { listWards } from "../db";
import { callGeminiJsonSafe } from "../gemini";
import type { WardId } from "../types";

const LOCATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    within_colombo: {
      type: "BOOLEAN",
      description: "True if the coordinates fall within Greater Colombo, Sri Lanka.",
    },
    matches_ward: {
      type: "BOOLEAN",
      description: "True if the coordinates are plausibly inside or near the named ward.",
    },
    reason: { type: "STRING", description: "One short sentence explaining the verdict." },
  },
  required: ["within_colombo", "matches_ward", "reason"],
};

export interface LocationCheckResult {
  location_matched: boolean;
  reason: string;
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
 * chosen ward and description using Gemini's knowledge of Colombo geography.
 * Falls back to a bounding-box check if AI is unavailable.
 */
export async function checkLocation(
  lat: number,
  lng: number,
  wardId: WardId,
  description: string,
): Promise<LocationCheckResult> {
  const boundsOk = withinColomboBounds(lat, lng);
  if (!boundsOk) {
    return { location_matched: false, reason: "Coordinates fall outside Greater Colombo." };
  }

  const prompt = `You are a geography plausibility checker for a disaster-response app covering Colombo, Sri Lanka.

Reported ward: ${wardId} — ${await wardName(wardId)}
Reported coordinates: lat ${lat}, lng ${lng}
Citizen description: ${description || "(none provided)"}

Decide:
1. Are these coordinates within Greater Colombo?
2. Are they plausibly inside or close to the named ward (allow a few kilometres of slack for a citizen's imprecise GPS)?

Respond only with JSON matching the schema.`;

  const { value } = await callGeminiJsonSafe<{
    within_colombo: boolean;
    matches_ward: boolean;
    reason: string;
  }>(prompt, LOCATION_SCHEMA, () => ({
    within_colombo: true,
    matches_ward: true,
    reason: "Fallback: within Colombo bounding box, AI verification unavailable.",
  }));

  return {
    location_matched: value.within_colombo && value.matches_ward,
    reason: value.reason,
  };
}
