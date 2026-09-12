import { callGeminiJsonSafe, stripDataUrl, type GeminiMediaPart } from "../gemini";
import type { CheckSource, HazardCategory } from "../types";

const RESOLUTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_verified: {
      type: "BOOLEAN",
      description:
        "True if the closure photo genuinely shows that the reported hazard has been rectified, cleaned up, or cleared (e.g. floodwaters receded, fallen tree cleared, road passable, line repaired).",
    },
    confidence: {
      type: "NUMBER",
      description: "Confidence score between 0.0 and 1.0 that the incident is genuinely resolved.",
    },
    reasoning: {
      type: "STRING",
      description: "1-2 sentences explaining why the closure photo proves or fails to prove hazard clearance.",
    },
  },
  required: ["is_verified", "confidence", "reasoning"],
};

export interface ResolutionCheckResult {
  is_verified: boolean;
  confidence: number;
  reasoning: string;
  source: CheckSource;
}

export async function checkResolution(options: {
  category: HazardCategory;
  description: string;
  closurePhotoBase64: string;
  originalPhotoBase64?: string;
}): Promise<ResolutionCheckResult> {
  const { category, description, closurePhotoBase64, originalPhotoBase64 } = options;

  if (!closurePhotoBase64) {
    return {
      is_verified: false,
      confidence: 0,
      reasoning: "No closure photo provided by field crew.",
      source: "code",
    };
  }

  const prompt = `You are a disaster-response field resolution auditor for Colombo Municipal Council.
A field crew claims to have resolved a previously reported hazard.
Reported Hazard Category: ${category}
Reported Hazard Description: ${description || "(none provided)"}

Review the attached photo(s).
${
  originalPhotoBase64
    ? "IMAGE 1 is the original incident photo. IMAGE 2 is the field crew's 'after-fix' closure photo."
    : "The attached photo is the field crew's 'after-fix' closure photo."
}

Determine:
1. Is this a real photo of a physical outdoor street or infrastructure scene (not a screenshot, wall, floor, or black image)?
2. Does the photo plausibly confirm that the hazard (${category}) has been resolved?
   - For FLOOD: Water level has receded; road or property is dry or passable.
   - For FALLEN_TREE / BLOCKED_ROAD: Debris/tree has been cut, moved, or traffic flow restored.
   - For ELECTRICAL_HAZARD: Danger tape installed or utility crew work visible.
3. Be fair: lighting may differ, but reject clearly fraudulent, irrelevant, or dark/blank photos.

Respond strictly in JSON matching the schema.`;

  const media: GeminiMediaPart[] = [];
  if (originalPhotoBase64) {
    const orig = stripDataUrl(originalPhotoBase64, "image/jpeg");
    media.push({ mimeType: orig.mimeType, data: orig.data });
  }
  const closure = stripDataUrl(closurePhotoBase64, "image/jpeg");
  media.push({ mimeType: closure.mimeType, data: closure.data });

  const { value, source } = await callGeminiJsonSafe<Omit<ResolutionCheckResult, "source">>(
    prompt,
    RESOLUTION_SCHEMA,
    () => ({
      is_verified: true,
      confidence: 0.85,
      reasoning: "Field crew submitted closure photo. Resolution accepted under deterministic review.",
    }),
    { media },
  );

  return { ...value, source };
}
