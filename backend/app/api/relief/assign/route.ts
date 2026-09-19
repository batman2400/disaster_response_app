import { json, options } from "@/lib/cors";
import {
  closeAssignedHazard,
  findHazard,
  OccupancyConflictError,
  releaseShelterBeds,
  reserveShelterBeds,
} from "@/lib/db";
import { appendOfficerNote } from "@/lib/officer-log";
import { parsePartySize } from "@/lib/party-size";
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

  const hazard = await findHazard(body.incident_id);
  if (!hazard) return json({ error: "Incident not found" }, 404);
  if (hazard.category !== "HELP_REQUEST") {
    return json({ error: "Only help requests can be assigned to a shelter" }, 400);
  }
  if (hazard.status === "RESOLVED") {
    return json({ error: "This request is already placed" }, 409);
  }

  let reserved;
  try {
    reserved = await reserveShelterBeds(body.shelter_id, beds);
  } catch (err) {
    const status = err instanceof OccupancyConflictError ? 409 : 400;
    return json({ error: err instanceof Error ? err.message : "Could not reserve beds" }, status);
  }

  const partySize = parsePartySize(hazard.description, hazard.summary);
  const note =
    (body.note ?? "").trim() ||
    `Assigned to ${reserved.name} (${beds} bed${beds === 1 ? "" : "s"})${
      partySize > 1 ? ` for party of ${partySize}` : ""
    }`;
  const trail = appendOfficerNote(hazard, {
    action: "assign",
    note,
    status: "RESOLVED",
  });
  const closed = {
    ...hazard,
    status: "RESOLVED" as const,
    resolved_at: new Date().toISOString(),
    ...trail,
  };

  try {
    const latest = await findHazard(body.incident_id);
    if (!latest || latest.status === "RESOLVED") {
      await releaseShelterBeds(reserved.id, beds);
      return json({ error: "This request is already placed" }, 409);
    }

    const stored = await closeAssignedHazard(closed);

    return json({
      incident_id: stored.id,
      status: stored.status,
      resolved_at: stored.resolved_at,
      officer_note: stored.officer_note,
      officer_log: stored.officer_log ?? [],
      beds,
      party_size: partySize,
      shelter: reserved,
    });
  } catch (err) {
    await releaseShelterBeds(reserved.id, beds);
    return json(
      { error: err instanceof Error ? err.message : "Assign failed" },
      500,
    );
  }
}
