import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

function readEnvLocalKeys(): string[] {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const keys: string[] = [];
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*(GEMINI_API_KEY(?:_FALLBACK(?:_\d+)?)?|GEMINI_FALLBACK_KEYS)\s*=\s*(.*)?\s*$/);
        if (match && match[2]) {
          const val = match[2].trim().replace(/^['"]|['"]$/g, "");
          for (const part of val.split(",")) {
            const trimmed = part.trim();
            if (trimmed && !keys.includes(trimmed)) {
              keys.push(trimmed);
            }
          }
        }
      }
      if (keys.length > 0) return keys;
    }
  } catch {}
  return [];
}

function geminiKeys() {
  const localKeys = readEnvLocalKeys();
  if (localKeys.length > 0) return localKeys;

  const sources = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
    process.env.GEMINI_API_KEY_FALLBACK_2,
    process.env.GEMINI_FALLBACK_KEYS,
  ];
  const keys: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    for (const part of src.split(",")) {
      const trimmed = part.trim();
      if (trimmed && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    }
  }
  return keys;
}

export function isMockAi() {
  return process.env.MOCK_AI === "1" || geminiKeys().length === 0;
}

export function getGemini() {
  const apiKey = geminiKeys()[0];
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

export function stripDataUrl(dataUrl: string, defaultMime = "image/jpeg") {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return { mimeType: defaultMime, data: dataUrl };
  }
  return { mimeType: match[1], data: match[2] };
}

export interface GeminiMediaPart {
  mimeType: string;
  data: string;
}

const keyCoolOffs = new Map<string, number>();

export function getPrioritizedKeys(): string[] {
  const all = geminiKeys();
  const now = Date.now();
  return all.slice().sort((a, b) => {
    const coolA = (keyCoolOffs.get(a) ?? 0) > now ? 1 : 0;
    const coolB = (keyCoolOffs.get(b) ?? 0) > now ? 1 : 0;
    return coolA - coolB;
  });
}

export async function callGeminiJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  photoBase64?: string,
  extraMedia?: GeminiMediaPart[],
): Promise<T> {
  const keys = getPrioritizedKeys();
  if (!keys.length) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (photoBase64) {
    const image = stripDataUrl(photoBase64, "image/jpeg");
    parts.unshift({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }
  if (extraMedia && extraMedia.length > 0) {
    for (const m of extraMedia) {
      parts.unshift({
        inlineData: { mimeType: m.mimeType, data: m.data },
      });
    }
  }

  let lastError: Error | null = null;
  for (const [index, apiKey] of keys.entries()) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: geminiModel(),
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response");
      }
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(lastError.message)) {
        keyCoolOffs.set(apiKey, Date.now() + 5 * 60 * 1000);
      }
      if (index < keys.length - 1) {
        console.warn("[gemini] key failed or quota hit, trying next prioritized key...");
      }
    }
  }

  throw lastError ?? new Error("Gemini call failed");
}

/**
 * Calls Gemini for structured JSON, but never lets a flaky network or a
 * missing key break the report pipeline. Honours MOCK_AI, races the call
 * against a timeout, and falls back to a deterministic fixture on any
 * failure — the demo must survive a dead hotspot.
 */
export async function callGeminiJsonSafe<T>(
  prompt: string,
  schema: Record<string, unknown>,
  fallback: () => T,
  options?: { photoBase64?: string; media?: GeminiMediaPart[]; timeoutMs?: number },
): Promise<{ value: T; source: "gemini" | "mock" | "fallback" }> {
  if (isMockAi()) {
    return { value: fallback(), source: "mock" };
  }

  const timeoutMs = options?.timeoutMs ?? 9000;
  try {
    const value = await Promise.race([
      callGeminiJson<T>(prompt, schema, options?.photoBase64, options?.media),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini call timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    return { value, source: "gemini" };
  } catch (err) {
    console.error("[gemini] call failed, using deterministic fallback:", (err as Error).message);
    return { value: fallback(), source: "fallback" };
  }
}
