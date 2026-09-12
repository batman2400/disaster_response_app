import { checkResolution } from "@/lib/checks/resolution";
import { json, options } from "@/lib/cors";
import { findHazard, saveHazard, uploadPhoto } from "@/lib/db";
import type { OfficerLogEntry, ResolveRequest } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: ResolveRequest;
  try {
    body = (await request.json()) as ResolveRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.incident_id || !body.closure_photo_base64) {
    return json({ error: "incident_id and closure_photo_base64 are required" }, 400);
  }

  const existing = await findHazard(body.incident_id);
  if (!existing) {
    return json({ error: "Incident not found" }, 404);
  }

  const resolutionCheck = await checkResolution({
    category: existing.category,
    description: existing.description || "",
    closurePhotoBase64: body.closure_photo_base64,
  });

  const resolved_at = new Date().toISOString();
  const closure_photo_url = await uploadPhoto(
    body.incident_id,
    body.closure_photo_base64,
    "closure",
  );

  const logEntry: OfficerLogEntry = {
    at: resolved_at,
    action: "resolve",
    note: `[AI Resolution Check: ${resolutionCheck.is_verified ? "VERIFIED" : "FLAGGED"}] ${resolutionCheck.reasoning}`,
    status: "RESOLVED",
  };

  const updatedLogs = existing.officer_log ? [...existing.officer_log, logEntry] : [logEntry];

  await saveHazard({
    ...existing,
    status: "RESOLVED",
    is_road_blocked: false,
    resolved_at,
    closure_photo_url,
    resolution_verified: resolutionCheck.is_verified,
    resolution_notes: resolutionCheck.reasoning,
    officer_log: updatedLogs,
  });

  return json({
    incident_id: body.incident_id,
    status: "RESOLVED",
    is_road_blocked: false,
    resolved_at,
    resolution_verified: resolutionCheck.is_verified,
    resolution_notes: resolutionCheck.reasoning,
  });
}
