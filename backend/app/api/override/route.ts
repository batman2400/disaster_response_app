import { json, options } from "@/lib/cors";
import { findHazard, saveHazard } from "@/lib/db";
import { appendOfficerNote, inferOfficerAction } from "@/lib/officer-log";
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

  const action = body.action ?? inferOfficerAction(existing.status, body.new_status);
  const note = (body.officer_note ?? "").trim();
  const trail = note
    ? appendOfficerNote(existing, {
        action,
        note,
        status: body.new_status,
      })
    : {
        officer_note: existing.officer_note,
        officer_log: existing.officer_log,
        dispatched_at: existing.dispatched_at,
      };

  const thresholds = await nudgeThresholds(existing.status, body.new_status);
  const resolved_at =
    body.new_status === "RESOLVED"
      ? existing.resolved_at ?? new Date().toISOString()
      : null;
  const is_road_blocked =
    body.is_road_blocked !== undefined
      ? body.is_road_blocked
      : body.new_status === "RESOLVED"
        ? false
        : existing.is_road_blocked;

  const updated = await saveHazard({
    ...existing,
    status: body.new_status,
    resolved_at,
    is_road_blocked,
    ...trail,
  });

  return json({
    incident_id: body.incident_id,
    status: body.new_status,
    officer_note: updated.officer_note,
    officer_log: updated.officer_log ?? [],
    dispatched_at: updated.dispatched_at ?? null,
    confirm_threshold: thresholds.confirm_threshold,
    reject_threshold: thresholds.reject_threshold,
  });
}
