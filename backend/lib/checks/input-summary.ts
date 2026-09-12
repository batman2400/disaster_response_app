import { callGeminiJsonSafe, stripDataUrl, type GeminiMediaPart } from "../gemini";
import type { CheckSource, HazardCategory, Urgency } from "../types";

const INPUT_SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: {
    has_speech: {
      type: "BOOLEAN",
      description:
        "True ONLY if clear, recognizable human speech or words are heard in the audio. False if audio is silent or contains only clicks, ticking, tapping, coughing, breathing, or background noise.",
    },
    summary: {
      type: "STRING",
      description:
        "A concise 1-2 sentence operational English brief. If the audio contains only clicks, ticking, or silence with no intelligible speech, state clearly that no spoken words or verbal details were detected. DO NOT hallucinate an emergency plea or hazard details if not actually spoken.",
    },
    detected_language: {
      type: "STRING",
      description: "Detected primary language: 'English', 'Sinhala', 'Tamil', 'Mixed', or 'None (No Speech)'.",
    },
    extracted_landmarks: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of named roads, junctions, temples, bridges, or areas extracted. Empty if none mentioned.",
    },
    urgency_hint: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "CRITICAL"],
      description: "Urgency suggested strictly by citizen speech or text. If audio has no spoken words, mark LOW.",
    },
  },
  required: ["has_speech", "summary", "detected_language", "extracted_landmarks", "urgency_hint"],
};

export interface InputSummaryResult {
  summary: string;
  detected_language: string;
  extracted_landmarks: string[];
  urgency_hint: Urgency;
  has_speech?: boolean;
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
    has_speech: Boolean(desc),
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
      has_speech: false,
      source: "code",
    };
  }

  const prompt = `You are an emergency triage & audio analysis AI for the Colombo Disaster Management Centre in Sri Lanka.
Citizen report category: ${category}
Citizen description text: ${description ? `"${description}"` : "(none provided)"}
${audioBase64 ? "- Citizen audio recording is attached." : "- No audio recording provided."}

CRITICAL SPEECH VERIFICATION & ANTI-HALLUCINATION RULES:
1. Listen carefully to the attached audio:
   - Does it contain actual recognizable human words/speech (in Sinhala, Tamil, or English)?
   - Or does it contain ONLY silence, clicking, ticking, tapping, coughing, breathing, or background noise?
2. IF NO HUMAN SPEECH IS SPOKEN (e.g. only 2 clicks/ticks, static, or ambient noise):
   - You MUST set has_speech = false.
   - You MUST set detected_language = "None (No Speech)".
   - You MUST set extracted_landmarks = [].
   - You MUST set urgency_hint = "LOW".
   - YOU MUST NEVER INVENT OR HALLUCINATE an emergency plea, trapped people, or flood descriptions!
   - If no written text was provided, set summary to: "Audio recording contains only clicking/ambient noise; no verbal description was spoken."
   - If written text was provided, summarize ONLY the written text.
3. IF RECOGNIZABLE SPOKEN WORDS ARE DETECTED:
   - Set has_speech = true.
   - Translate and summarize strictly what was actually spoken by the citizen. Focus on the actual hazard condition, named locations, and genuine urgency mentioned.
   - Do not embellish or assume unmentioned details.

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

  // Safety guardrail: Overwrite hallucinated summaries if audio had no discernible speech
  const hasNoSpeech =
    value.has_speech === false ||
    /only (clicking|ticking|ambient|noise|clicks|ticks)/i.test(value.summary) ||
    /no (speech|words|voice|spoken|verbal)/i.test(value.summary);

  if (hasNoSpeech && !description.trim()) {
    value.summary = "Audio recording contains only clicking/ambient noise; no verbal hazard description was spoken.";
    value.detected_language = "None (No Speech)";
    value.extracted_landmarks = [];
    value.urgency_hint = "LOW";
  } else if (hasNoSpeech && description.trim()) {
    value.summary = `${category}: ${description} (Audio note contained no spoken words)`;
  }

  return { ...value, source };
}
