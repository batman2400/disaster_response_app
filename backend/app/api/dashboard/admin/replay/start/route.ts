import { after } from "next/server";

import { json, options } from "@/lib/cors";
import { readDashboardRole } from "@/lib/dashboard-auth";
import { continueReplay, replayGeneration, startReplay } from "@/lib/replay";

export const maxDuration = 60;

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  if ((await readDashboardRole()) !== "officer") {
    return json({ error: "Officer session required" }, 401);
  }

  let body: { ward_id?: unknown; interval_ms?: unknown } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as { ward_id?: unknown; interval_ms?: unknown };
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const state = await startReplay(body);
  const generation = replayGeneration();
  after(async () => {
    await continueReplay(generation);
  });
  return json(state);
}
