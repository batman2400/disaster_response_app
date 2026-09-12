import { json, options } from "@/lib/cors";
import { findHazard, saveHazard } from "@/lib/db";
import { nudgeThresholds } from "@/lib/pipeline";
import type { OverrideRequest } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: OverrideRequest;
  try {
    body = (await request.json()) as OverrideRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.incident_id || !body.new_status) {
    return json({ error: "incident_id and new_status are required" }, 400);
  }

  const existing = await findHazard(body.incident_id);
  if (!existing) {
    return json({ error: "Incident not found" }, 404);
  }

  const thresholds = await nudgeThresholds(existing.status, body.new_status);
  await saveHazard({
    ...existing,
    status: body.new_status,
    officer_note: body.officer_note || existing.officer_note,
  });

  return json({
    incident_id: body.incident_id,
    status: body.new_status,
    officer_note: body.officer_note,
    confirm_threshold: thresholds.confirm_threshold,
    reject_threshold: thresholds.reject_threshold,
  });
}
