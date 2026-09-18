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
    input_verified: {
      type: "BOOLEAN",
      description:
        "True ONLY if citizen speech or written description genuinely describes an actual disaster, hazard, flood, road obstruction, fallen tree, or emergency. MUST BE FALSE if audio or text contains singing, music, song lyrics, casual chat, prank, clicking/ambient noise, or NO hazard description.",
    },
    extracted_landmarks: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of named roads, junctions, temples, bridges, or areas extracted. Empty if none mentioned.",
    },
    urgency_hint: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "CRITICAL"],
      description: "Urgency suggested strictly by citizen speech or text. If audio has no spoken words or contains singing/non-hazard content, mark LOW.",
    },
  },
  required: ["has_speech", "summary", "detected_language", "input_verified", "extracted_landmarks", "urgency_hint"],
};

export interface InputSummaryResult {
  summary: string;
  detected_language: string;
  extracted_landmarks: string[];
  urgency_hint: Urgency;
  has_speech?: boolean;
  input_verified?: boolean;
  source: CheckSource;
}

function heuristicFallback(description?: string, category?: HazardCategory): InputSummaryResult {
  const desc = (description || "").trim();
  const text = desc.toLowerCase();
  const isSevere = /(trapped|deep|waist|chest|dying|urgent|submerged|live wire|danger|sweep)/i.test(text);

  let detected_language = "English";
  if (/[\u0B80-\u0BFF]/.test(desc)) detected_language = "Tamil";
  else if (/[\u0D80-\u0DFF]/.test(desc)) detected_language = "Sinhala";

  const isSingingOrNonHazard = /(singing|song|music|lyrics)/i.test(text);
  const input_verified = Boolean(desc) && !isSingingOrNonHazard;

  const summary = desc
    ? `${category || "Incident"} reported: "${desc.length > 80 ? desc.slice(0, 77) + "..." : desc}"`
    : `Hazard verified for category ${category || "GENERAL"}.`;

  return {
    summary,
    detected_language,
    extracted_landmarks: [],
    urgency_hint: isSevere ? "CRITICAL" : "MEDIUM",
    has_speech: Boolean(desc),
    input_verified,
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
   - Does it contain actual recognizable human words/speech/singing?
   - Or does it contain ONLY silence, clicking, ticking, tapping, coughing, breathing, or background noise?
2. ACCURATE MULTILINGUAL LANGUAGE IDENTIFICATION:
   - Sri Lanka has two official national languages: Sinhala and Tamil, plus English.
   - Accurately distinguish Tamil vs Sinhala:
     * TAMIL (Dravidian): Distinctive Tamil phonetics, retroflex sounds ('zh/ழ', 'L/ள', 'R/ற'), lack of voiced/aspirated stops, Tamil vocabulary/lyrics (e.g., "வணக்கம்" / vanakkam, "பாடல்" / paadal, "மழை" / mazhai, "தண்ணீர்" / thanneer, "வெள்ளம்" / vellam, "கண்ணே" / kanne, Tamil cinema/film songs, Tamil singing). If the speech or singing is in Tamil, you MUST set detected_language = "Tamil". NEVER classify Tamil audio/song as Sinhala!
     * SINHALA (Indo-Aryan): Distinctive Sinhala phonetics, pre-nasalized consonants ('ඟ', 'ඳ', 'ඬ', 'ඹ'), words like "වතුර" / wathura, "වැස්ස" / wassa, "ගංවතුර" / gamwathura, "බේරගන්න" / beraganna.
     * ENGLISH: English words.
     * NONE (No Speech): If only silence, clicks, ticking, tapping, coughing, breathing, or ambient noise.
3. HAZARD CONTENT VS ENTERTAINMENT / JUNK:
   - Does the audio or text genuinely report an emergency or physical hazard (flooding, trapped persons, fallen tree, wire down, landslide)?
   - If the audio or text contains SINGING, MUSIC, SONG LYRICS, ENTERTAINMENT, CASUAL CHAT, PRANK, OR NO HAZARD DESCRIPTION:
     * You MUST set input_verified = false!
     * Set summary to clearly state what was heard (e.g. "Audio contains singing with no description of a hazard").
     * DO NOT hallucinate an emergency plea or hazard details!
     * Set urgency_hint = "LOW".
   - If recognizable speech or text genuinely describes a hazard/emergency:
     * Set input_verified = true.
     * Translate and summarize strictly what was actually spoken/written by the citizen. Focus on the actual hazard condition, named locations, and genuine urgency mentioned.
4. IF NO HUMAN SPEECH IS SPOKEN (e.g. only clicks/ticks, static, or ambient noise):
   - You MUST set has_speech = false, input_verified = false.
   - You MUST set detected_language = "None (No Speech)".
   - You MUST set extracted_landmarks = [].
   - You MUST set urgency_hint = "LOW".
   - YOU MUST NEVER INVENT OR HALLUCINATE an emergency plea, trapped people, or flood descriptions!
   - If no written text was provided, set summary to: "Audio recording contains only clicking/ambient noise; no verbal description was spoken."
   - If written text was provided, summarize ONLY the written text.

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

  const hasSingingOrNonHazard =
    value.input_verified === false ||
    /\b(singing|song|music|lyrics|melody|no (description of a hazard|hazard described|emergency described|verbal description))\b/i.test(
      value.summary,
    );

  if (hasNoSpeech && !description.trim()) {
    value.summary = "Audio recording contains only clicking/ambient noise; no verbal hazard description was spoken.";
    value.detected_language = "None (No Speech)";
    value.extracted_landmarks = [];
    value.urgency_hint = "LOW";
    value.input_verified = false;
  } else if (hasSingingOrNonHazard && !description.trim()) {
    value.input_verified = false;
    value.urgency_hint = "LOW";
  } else if (hasNoSpeech && description.trim()) {
    value.summary = `${category}: ${description} (Audio note contained no spoken words)`;
  }

  // Language consistency guardrail: If summary mentions Tamil (e.g. Tamil song/singing) or text has Tamil script, ensure detected_language is Tamil
  if (
    (/tamil/i.test(value.summary) || /[\u0B80-\u0BFF]/.test(description || "")) &&
    value.detected_language !== "Tamil"
  ) {
    value.detected_language = "Tamil";
  }

  return { ...value, source };
}
