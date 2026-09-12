import { listRetuneLogs, updateAiThresholds } from "@/lib/admin";
import { json, options } from "@/lib/cors";
import { getAiSettings } from "@/lib/db";

export function OPTIONS() {
  return options();
}

export async function GET() {
  const [settings, logs] = await Promise.all([
    getAiSettings(),
    listRetuneLogs(),
  ]);

  return json({
    settings,
    logs,
  });
}

export async function POST(request: Request) {
  let body: {
    confirm_threshold?: number;
    reject_threshold?: number;
    note?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (
    typeof body.confirm_threshold !== "number" ||
    typeof body.reject_threshold !== "number"
  ) {
    return json({ error: "confirm_threshold and reject_threshold numbers are required" }, 400);
  }

  const result = await updateAiThresholds(
    body.confirm_threshold,
    body.reject_threshold,
    body.note || "Manual calibration in System Admin",
  );

  return json({
    success: true,
    settings: result.settings,
    log: result.log,
  });
}
