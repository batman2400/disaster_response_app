import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
try {
  const pager = await ai.models.list();
  const names = [];
  for await (const model of pager) {
    names.push(model.name);
  }
  console.log(names.filter((name) => /flash|gemini/i.test(name ?? "")).slice(0, 30).join("\n"));
  console.log("count", names.length);
} catch (err) {
  console.error("list failed", err?.message ?? err);
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Reply with the single word pong",
    });
    console.log("flash probe", res.text);
  } catch (inner) {
    console.error("flash probe failed", inner?.message ?? inner);
  }
}
