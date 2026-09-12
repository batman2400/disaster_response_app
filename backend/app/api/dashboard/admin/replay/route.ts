import { json, options } from "@/lib/cors";
import { readDashboardRole } from "@/lib/dashboard-auth";
import { getReplayState } from "@/lib/replay";

export function OPTIONS() {
  return options();
}

export async function GET() {
  if ((await readDashboardRole()) !== "officer") {
    return json({ error: "Officer session required" }, 401);
  }
  return json(await getReplayState());
}
