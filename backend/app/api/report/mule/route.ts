import { json, options } from "@/lib/cors";
import { saveHazard } from "@/lib/db";
import { nearestWard } from "@/lib/geo";
import type { DataMuleBeacon, HazardRow } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: { beacons: DataMuleBeacon[]; crew_id?: string };
  try {
    body = (await request.json()) as { beacons: DataMuleBeacon[]; crew_id?: string };
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (!body.beacons || !Array.isArray(body.beacons) || body.beacons.length === 0) {
    return json({ error: "No beacons provided" }, 400);
  }

  const crewId = body.crew_id || "Field Rescue Unit";
  const results: string[] = [];

  for (const beacon of body.beacons) {
    const incidentId = crypto.randomUUID();
    const isCritical = beacon.medical_priority === "CRITICAL" || beacon.help_request;

    const rawLat = Number(beacon.lat);
    const rawLng = Number(beacon.lng);
    const lat = !isNaN(rawLat) && rawLat !== 0 ? rawLat : 6.9535;
    const lng = !isNaN(rawLng) && rawLng !== 0 ? rawLng : 79.8732;
    const ward_id = beacon.ward_id && beacon.ward_id !== "ward_01" ? beacon.ward_id : nearestWard(lat, lng);

    const row: HazardRow = {
      id: incidentId,
      lat,
      lng,
      ward_id,
      category: beacon.category,
      description: `[DATA MULE RESCUE RELAY - Relayed via ${crewId}] ${beacon.description || "Zero-signal stranded citizen emergency"} (Est. Persons: ${beacon.estimated_people || 1}, Medical: ${beacon.medical_priority || "MEDIUM"})`,
      photo_url: null,
      status: isCritical ? "AREA_ALERT" : "PUBLISHED",
      urgency: beacon.medical_priority || (isCritical ? "CRITICAL" : "MEDIUM"),
      confidence_score: 0.95, // High confidence since verified in-person by field squad
      is_road_blocked: true,
      confirmations_count: 1,
      created_at: beacon.created_at || new Date().toISOString(),
      resolved_at: null,
      closure_photo_url: null,
      officer_note: `Ingested via offline QR Data Mule relay by ${crewId}. Citizen had zero cellular connectivity at scene.`,
    };

    await saveHazard(row);
    results.push(incidentId);
  }

  return json({
    success: true,
    synced_count: results.length,
    incident_ids: results,
  });
}
