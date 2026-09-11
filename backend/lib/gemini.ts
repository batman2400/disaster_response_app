import { GoogleGenAI } from "@google/genai";

export function isMockAi() {
  return process.env.MOCK_AI === "1" || !process.env.GEMINI_API_KEY;
}

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

export function stripDataUrl(photoBase64: string) {
  const match = photoBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return { mimeType: "image/jpeg", data: photoBase64 };
  }
  return { mimeType: match[1], data: match[2] };
}

export async function callGeminiJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  photoBase64?: string,
): Promise<T> {
  const ai = getGemini();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (photoBase64) {
    const image = stripDataUrl(photoBase64);
    parts.unshift({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }

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
}
