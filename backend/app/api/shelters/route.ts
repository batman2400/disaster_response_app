import { json, options } from "@/lib/cors";
import { findShelter, listShelters, saveShelter } from "@/lib/db";
import { requireApiRole } from "@/lib/require-role";
import type { ShelterUpdateRequest, SuppliesStatus } from "@/lib/types";

const SUPPLIES: SuppliesStatus[] = ["ADEQUATE", "LOW", "CRITICAL"];

export function OPTIONS() {
  return options();
}

export async function GET() {
  return json(await listShelters());
}

export async function PATCH(request: Request) {
  const denied = await requireApiRole("relief");
  if (denied) return denied;

  let body: ShelterUpdateRequest;
  try {
    body = (await request.json()) as ShelterUpdateRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.shelter_id) {
    return json({ error: "shelter_id is required" }, 400);
  }
  if (body.occupied_beds === undefined && body.supplies_status === undefined) {
    return json({ error: "occupied_beds or supplies_status is required" }, 400);
  }

  const existing = await findShelter(body.shelter_id);
  if (!existing) return json({ error: "Shelter not found" }, 404);

  let occupied_beds = existing.occupied_beds;
  if (body.occupied_beds !== undefined) {
    if (!Number.isInteger(body.occupied_beds) || body.occupied_beds < 0 || body.occupied_beds > existing.total_beds) {
      return json({ error: "occupied_beds must be between 0 and total_beds" }, 400);
    }
    occupied_beds = body.occupied_beds;
  }

  let supplies_status = existing.supplies_status;
  if (body.supplies_status !== undefined) {
    if (!SUPPLIES.includes(body.supplies_status)) {
      return json({ error: "supplies_status must be ADEQUATE, LOW, or CRITICAL" }, 400);
    }
    supplies_status = body.supplies_status;
  }

  return json(
    await saveShelter({
      ...existing,
      occupied_beds,
      supplies_status,
    }),
  );
}
