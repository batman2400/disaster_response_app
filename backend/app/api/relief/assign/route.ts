import { json, options } from "@/lib/cors";
import { findHazard, findShelter, saveHazard, saveShelter } from "@/lib/db";
import { appendOfficerNote } from "@/lib/officer-log";
import { requireApiRole } from "@/lib/require-role";
import type { AssignRequest } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const denied = await requireApiRole("relief");
  if (denied) return denied;

  let body: AssignRequest;
  try {
    body = (await request.json()) as AssignRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.incident_id || !body.shelter_id) {
    return json({ error: "incident_id and shelter_id are required" }, 400);
  }

  const beds = body.beds ?? 1;
  if (!Number.isInteger(beds) || beds < 1) {
    return json({ error: "beds must be a positive integer" }, 400);
  }

  const [hazard, shelter] = await Promise.all([findHazard(body.incident_id), findShelter(body.shelter_id)]);
  if (!hazard) return json({ error: "Incident not found" }, 404);
  if (!shelter) return json({ error: "Shelter not found" }, 404);

  if (hazard.category !== "HELP_REQUEST") {
    return json({ error: "Only help requests can be assigned to a shelter" }, 400);
  }
  if (hazard.status === "RESOLVED") {
    return json({ error: "This request is already resolved" }, 400);
  }

  const free = shelter.total_beds - shelter.occupied_beds;
  if (beds > free) {
    return json({ error: "Not enough free beds" }, 400);
  }

  const updatedShelter = await saveShelter({
    ...shelter,
    occupied_beds: shelter.occupied_beds + beds,
  });

  const note =
    (body.note ?? "").trim() || `Assigned to ${shelter.name} (${beds} bed${beds === 1 ? "" : "s"})`;
  const trail = appendOfficerNote(hazard, {
    action: "assign",
    note,
    status: "RESOLVED",
  });
  const updatedHazard = await saveHazard({
    ...hazard,
    status: "RESOLVED",
    resolved_at: new Date().toISOString(),
    ...trail,
  });

  return json({
    incident_id: updatedHazard.id,
    status: updatedHazard.status,
    resolved_at: updatedHazard.resolved_at,
    officer_note: updatedHazard.officer_note,
    officer_log: updatedHazard.officer_log ?? [],
    shelter: updatedShelter,
  });
}
