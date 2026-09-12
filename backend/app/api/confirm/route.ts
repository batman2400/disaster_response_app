import { json, options } from "@/lib/cors";
import { confirmHazard } from "@/lib/db";
import type { ConfirmRequest } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: ConfirmRequest;
  try {
    body = (await request.json()) as ConfirmRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.incident_id) {
    return json({ error: "incident_id is required" }, 400);
  }

  const updated = await confirmHazard(body.incident_id);
  if (!updated) {
    return json({ error: "Incident not found" }, 404);
  }

  return json({
    incident_id: updated.id,
    confirmations_count: updated.confirmations_count,
    status: updated.status,
  });
}
