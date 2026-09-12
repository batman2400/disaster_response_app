import { callGeminiJsonSafe } from "../gemini";
import type { HazardCategory } from "../types";

const IMAGE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_real_photo: {
      type: "BOOLEAN",
      description: "True if this is a genuine photo of a real scene (not a screenshot, drawing, meme, or stock image).",
    },
    matches_category: {
      type: "BOOLEAN",
      description: "True if the photo plausibly shows the reported hazard category.",
    },
    reason: { type: "STRING", description: "One short sentence explaining the verdict." },
  },
  required: ["is_real_photo", "matches_category", "reason"],
};

export interface ImageCheckResult {
  image_verified: boolean;
  reason: string;
}

/**
 * Check 1 — Image (AI). Uses Gemini vision to confirm the attached photo is
 * a genuine photo that plausibly matches the reported category.
 */
export async function checkImage(
  photoBase64: string | undefined,
  category: HazardCategory,
  description: string,
): Promise<ImageCheckResult> {
  if (!photoBase64) return { image_verified: false, reason: "No photo attached." };

  const prompt = `You are a photo verifier for a disaster-response app in Colombo, Sri Lanka.
Reported hazard category: ${category}
Citizen description: ${description || "(none provided)"}

Look at the attached photo and decide:
1. Is this a genuine photo of a real physical scene (not a screenshot, drawing, meme, or unrelated stock photo)?
2. Does the photo plausibly show a scene consistent with the reported category (${category})? Be reasonably lenient — partial views, night shots, and rain-blurred photos still count if the general hazard is visible.

Respond only with JSON matching the schema.`;

  const { value } = await callGeminiJsonSafe<{
    is_real_photo: boolean;
    matches_category: boolean;
    reason: string;
  }>(prompt, IMAGE_SCHEMA, () => ({
    is_real_photo: true,
    matches_category: true,
    reason: "Fallback: photo attached, AI verification unavailable.",
  }), { photoBase64 });

  return {
    image_verified: value.is_real_photo && value.matches_category,
    reason: value.reason,
  };
}
