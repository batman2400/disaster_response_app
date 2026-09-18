import { json, options } from "@/lib/cors";
import { createSupplyRequest, findShelter, listSupplyRequests, updateSupplyRequest } from "@/lib/db";
import { requireApiRole } from "@/lib/require-role";
import type { SuppliesStatus, SupplyRequestStatus, Urgency, WardId } from "@/lib/types";

const SUPPLIES: SuppliesStatus[] = ["ADEQUATE", "LOW", "CRITICAL"];
const STATUSES: SupplyRequestStatus[] = ["OPEN", "ACKNOWLEDGED", "DISPATCHED"];

export function OPTIONS() {
  return options();
}

export async function GET() {
  return json({ requests: listSupplyRequests() });
}

export async function POST(request: Request) {
  const denied = await requireApiRole("relief");
  if (denied) return denied;

  let body: {
    shelter_id?: string;
    shelter_name?: string;
    ward_id?: WardId;
    items?: string[];
    supplies_status?: SuppliesStatus;
    urgency?: Urgency;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.shelter_id) {
    return json({ error: "shelter_id is required" }, 400);
  }

  const shelter = await findShelter(body.shelter_id);
  if (!shelter) return json({ error: "Shelter not found" }, 404);

  const supplies_status =
    body.supplies_status && SUPPLIES.includes(body.supplies_status) ? body.supplies_status : shelter.supplies_status;
  const urgency: Urgency =
    body.urgency || (supplies_status === "CRITICAL" ? "CRITICAL" : supplies_status === "LOW" ? "MEDIUM" : "LOW");
  const items = (body.items || []).map((item) => item.trim()).filter(Boolean);

  const created = createSupplyRequest({
    shelter_id: shelter.id,
    shelter_name: body.shelter_name?.trim() || shelter.name,
    ward_id: body.ward_id || shelter.ward_id,
    items: items.length > 0 ? items : ["Emergency rations, water, and medical kits"],
    supplies_status,
    urgency,
    note: body.note?.trim() || undefined,
  });

  return json({ success: true, request: created }, 201);
}

export async function PATCH(request: Request) {
  const denied = await requireApiRole("officer");
  if (denied) return denied;

  let body: {
    request_id?: string;
    status?: SupplyRequestStatus;
    officer_note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.request_id || !body.status) {
    return json({ error: "request_id and status are required" }, 400);
  }
  if (!STATUSES.includes(body.status)) {
    return json({ error: "status must be OPEN, ACKNOWLEDGED, or DISPATCHED" }, 400);
  }

  const updated = updateSupplyRequest(body.request_id, {
    status: body.status,
    officer_note: body.officer_note?.trim() || undefined,
  });
  if (!updated) return json({ error: "Supply request not found" }, 404);

  return json({ success: true, request: updated });
}
