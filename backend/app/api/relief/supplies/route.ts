import { json, options } from "@/lib/cors";
import { createShelterNeed, listShelterNeeds, pledgeShelterNeed } from "@/lib/db";
import type { ShelterNeed, ShelterNeedCategory, ShelterPledge, Urgency, WardId } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function GET() {
  const needs = listShelterNeeds();
  return json({ needs });
}

export async function POST(request: Request) {
  let body: {
    shelter_id: string;
    shelter_name: string;
    ward_id: WardId;
    item_name: string;
    category: ShelterNeedCategory;
    quantity_needed: string;
    urgency: Urgency;
    coordinator_name: string;
    coordinator_phone: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.shelter_id || !body.item_name || !body.quantity_needed) {
    return json({ error: "shelter_id, item_name, and quantity_needed are required" }, 400);
  }

  const id = `need-${Date.now()}`;
  const newNeed: ShelterNeed = {
    id,
    shelter_id: body.shelter_id,
    shelter_name: body.shelter_name,
    ward_id: body.ward_id || "ward_01",
    item_name: body.item_name,
    category: body.category || "OTHER",
    quantity_needed: body.quantity_needed,
    quantity_pledged: "0",
    urgency: body.urgency || "MEDIUM",
    status: "OPEN",
    coordinator_name: body.coordinator_name || "Shelter Coordinator",
    coordinator_phone: body.coordinator_phone || "117",
    pledges: [],
    created_at: new Date().toISOString(),
  };

  const created = createShelterNeed(newNeed);
  return json({ success: true, need: created }, 201);
}

export async function PATCH(request: Request) {
  let body: {
    need_id: string;
    donor_name: string;
    contact_phone: string;
    quantity: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.need_id || !body.donor_name || !body.contact_phone || !body.quantity) {
    return json({ error: "need_id, donor_name, contact_phone, and quantity are required" }, 400);
  }

  const pledge: ShelterPledge = {
    id: `pledge-${Date.now()}`,
    donor_name: body.donor_name.trim(),
    contact_phone: body.contact_phone.trim(),
    quantity: body.quantity.trim(),
    notes: body.notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  const updated = pledgeShelterNeed(body.need_id, pledge);
  if (!updated) {
    return json({ error: "Shelter need not found" }, 404);
  }

  return json({ success: true, need: updated });
}
