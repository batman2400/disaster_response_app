import { callGeminiJsonSafe, stripDataUrl, type GeminiMediaPart } from "../gemini";
import type { CheckSource, HazardCategory, Urgency } from "../types";

const INPUT_SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description:
        "A concise 1-2 sentence operational English brief stating the hazard condition, exact landmarks/roads mentioned, and human urgency.",
    },
    detected_language: {
      type: "STRING",
      description: "Detected primary language: 'English', 'Sinhala', 'Tamil', or 'Mixed'.",
    },
    extracted_landmarks: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of named roads, junctions, temples, bridges, or areas extracted.",
    },
    urgency_hint: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "CRITICAL"],
      description: "Urgency suggested by citizen speech (e.g. trapped, deep water, live wires).",
    },
  },
  required: ["summary", "detected_language", "extracted_landmarks", "urgency_hint"],
};

export interface InputSummaryResult {
  summary: string;
  detected_language: string;
  extracted_landmarks: string[];
  urgency_hint: Urgency;
  source: CheckSource;
}

function heuristicFallback(description?: string, category?: HazardCategory): InputSummaryResult {
  const desc = (description || "").trim();
  const text = desc.toLowerCase();
  const isSevere = /(trapped|deep|waist|chest|dying|urgent|submerged|live wire|danger|sweep)/i.test(text);

  let detected_language = "English";
  if (/[\u0D80-\u0DFF]/.test(desc)) detected_language = "Sinhala";
  else if (/[\u0B80-\u0BFF]/.test(desc)) detected_language = "Tamil";

  const summary = desc
    ? `${category || "Incident"} reported: "${desc.length > 80 ? desc.slice(0, 77) + "..." : desc}"`
    : `Hazard verified for category ${category || "GENERAL"}.`;

  return {
    summary,
    detected_language,
    extracted_landmarks: [],
    urgency_hint: isSevere ? "CRITICAL" : "MEDIUM",
    source: "code",
  };
}

export async function summarizeCitizenInput(options: {
  description?: string;
  category?: HazardCategory;
  audioBase64?: string;
  audioMime?: string;
}): Promise<InputSummaryResult> {
  const { description = "", category = "FLOOD", audioBase64, audioMime = "audio/mp3" } = options;

  if (!description.trim() && !audioBase64) {
    return {
      summary: `Report filed for ${category}. Awaiting field verification.`,
      detected_language: "English",
      extracted_landmarks: [],
      urgency_hint: "LOW",
      source: "code",
    };
  }

  const prompt = `You are an emergency call & report ingestion AI for the Colombo Disaster Management Centre in Sri Lanka.
Citizen report category: ${category}
Citizen description text: ${description || "(none provided, audio attached)"}

Your task:
1. Citizen messages may be in Sinhala, Tamil, English, or Singlish/Tanglish (Sinhala/Tamil written in Latin script).
2. Translate and synthesize the message into a concise, professional 1-2 sentence operational English summary. Focus on:
   - Specific hazard condition (e.g. waist-deep floodwater, fallen mango tree blocking 2 lanes).
   - Specific locations, bridges, roads, or landmarks mentioned.
   - Any people, children, or elderly trapped or needing immediate evacuation.
3. Identify the primary detected language.
4. Extract any named landmarks, road names, or junctions.
5. Suggest an urgency hint: LOW, MEDIUM, or CRITICAL.

Respond strictly in JSON matching the schema.`;

  const mediaParts: GeminiMediaPart[] = [];
  if (audioBase64) {
    const stripped = stripDataUrl(audioBase64, audioMime);
    mediaParts.push({ mimeType: stripped.mimeType, data: stripped.data });
  }

  const { value, source } = await callGeminiJsonSafe<Omit<InputSummaryResult, "source">>(
    prompt,
    INPUT_SUMMARY_SCHEMA,
    () => heuristicFallback(description, category),
    { media: mediaParts.length > 0 ? mediaParts : undefined },
  );

  return { ...value, source };
}
