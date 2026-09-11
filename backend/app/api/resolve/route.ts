import { json, options } from "@/lib/cors";
import { findHazard, saveHazard, uploadPhoto } from "@/lib/db";
import type { ResolveRequest } from "@/lib/types";

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

  const resolved_at = new Date().toISOString();
  const closure_photo_url = await uploadPhoto(
    body.incident_id,
    body.closure_photo_base64,
    "closure",
  );
  await saveHazard({
    ...existing,
    status: "RESOLVED",
    is_road_blocked: false,
    resolved_at,
    closure_photo_url,
  });

  return json({
    incident_id: body.incident_id,
    status: "RESOLVED",
    is_road_blocked: false,
    resolved_at,
  });
}
