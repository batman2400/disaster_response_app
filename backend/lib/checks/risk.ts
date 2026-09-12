import { callGeminiJsonSafe } from "../gemini";
import type { HazardCategory, Urgency } from "../types";

const RISK_SCHEMA = {
  type: "OBJECT",
  properties: {
    risk_level: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "CRITICAL"],
      description: "Overall severity of the hazard for people nearby, based on the photo and description.",
    },
    reason: { type: "STRING", description: "One short sentence explaining the severity call." },
  },
  required: ["risk_level", "reason"],
};

export interface RiskCheckResult {
  risk_level: Urgency;
  reason: string;
}

function heuristicRisk(category: HazardCategory, description: string): RiskCheckResult {
  const text = description.toLowerCase();
  const severe = /(waist|chest|deep|trapped|collapsed|drowning|sweep|stranded|urgent|dying|injur)/.test(text);
  if (category === "FLOOD" && severe) {
    return { risk_level: "CRITICAL", reason: "Fallback keyword match: severe flood language in description." };
  }
  if (category === "FLOOD" || category === "BLOCKED_ROAD") {
    return { risk_level: "MEDIUM", reason: "Fallback: category implies at least moderate risk." };
  }
  return { risk_level: "LOW", reason: "Fallback: no severity signal found, AI verification unavailable." };
}

/**
 * Check 5 — Risk (AI). Uses Gemini to grade severity from the photo and
 * description independent of weather/cluster signals, so the aggregator can
 * weigh AI-perceived danger against sensor telemetry.
 */
export async function checkRisk(
  category: HazardCategory,
  description: string,
  photoBase64?: string,
): Promise<RiskCheckResult> {
  const prompt = `You are a severity triage assistant for a disaster-response app in Colombo, Sri Lanka.

Reported category: ${category}
Citizen description: ${description || "(none provided)"}
${photoBase64 ? "A photo of the scene is attached." : "No photo was attached."}

Grade the immediate risk to people and property as LOW, MEDIUM, or CRITICAL:
- CRITICAL: life-threatening right now (deep/rising floodwater, people trapped, major road totally impassable, structural collapse).
- MEDIUM: real hazard needing action soon but not immediately life-threatening (ankle/knee-deep water, partial road blockage, fallen tree not blocking full road).
- LOW: minor or already-contained hazard.

Respond only with JSON matching the schema.`;

  const { value } = await callGeminiJsonSafe<{ risk_level: Urgency; reason: string }>(
    prompt,
    RISK_SCHEMA,
    () => heuristicRisk(category, description),
    { photoBase64 },
  );

  return value;
}
