import type { ShelterRow, WardId } from "./types";

/**
 * Static safe evacuation routes leading out of hazard hotspots
 * toward the nearest designated emergency shelter.
 */
export const SAFE_ROUTES: Record<WardId, [number, number][]> = {
  ward_01: [
    [6.9535, 79.8732], // Nagalagam St hazard hotspot
    [6.9605, 79.879],
    [6.9698, 79.8917], // toward Peliyagoda Community Centre
  ],
  ward_02: [
    [6.9271, 79.8612], // Bauddhaloka Mawatha hazard hotspot
    [6.921, 79.8624],
    [6.9147, 79.8636], // toward Town Hall Relief Bay
  ],
  ward_03: [
    [6.9355, 79.85], // Pettah hazard hotspot
    [6.935, 79.846],
    [6.9344, 79.8428], // toward Fort Railway Waiting Hall
  ],
};

/**
 * Approximate geographical coordinates for Colombo municipal shelters
 */
export const SHELTER_LOCATIONS: Record<string, [number, number]> = {
  "Kelaniya Temple Hall": [6.958, 79.882],
  "Peliyagoda Community Centre": [6.9698, 79.8917],
  "Town Hall Relief Bay": [6.9147, 79.8636],
  "Thimbirigasyaya School": [6.892, 79.868],
  "Fort Railway Waiting Hall": [6.9344, 79.8428],
};

export interface ShelterWithCoords extends ShelterRow {
  lat: number;
  lng: number;
  available_beds: number;
}

export interface DynamicRouteResult {
  ward_id: WardId;
  status: "CLEAR" | "CAUTION" | "COMPROMISED";
  points: [number, number][];
  detour_points?: [number, number][];
  active_obstructions: number;
  reason: string;
}

export function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DETOUR_ROUTES: Record<WardId, [number, number][]> = {
  ward_01: [
    [6.9535, 79.8732],
    [6.959, 79.869],
    [6.965, 79.88],
    [6.9698, 79.8917],
  ],
  ward_02: [
    [6.9271, 79.8612],
    [6.923, 79.856],
    [6.918, 79.859],
    [6.9147, 79.8636],
  ],
  ward_03: [
    [6.9355, 79.85],
    [6.937, 79.846],
    [6.9344, 79.8428],
  ],
};

export function computeDynamicRoute(
  wardId: WardId,
  hazards: Array<{ lat: number; lng: number; is_road_blocked: boolean; status: string }>,
): DynamicRouteResult {
  const basePoints = SAFE_ROUTES[wardId] || [];
  const blockedHazards = hazards.filter(
    (h) => h.is_road_blocked && h.status !== "RESOLVED",
  );

  let nearCount = 0;
  for (const pt of basePoints) {
    for (const h of blockedHazards) {
      if (haversineDistanceM(pt[0], pt[1], h.lat, h.lng) < 250) {
        nearCount++;
      }
    }
  }

  if (nearCount > 0) {
    return {
      ward_id: wardId,
      status: "COMPROMISED",
      points: DETOUR_ROUTES[wardId] || basePoints,
      detour_points: DETOUR_ROUTES[wardId],
      active_obstructions: nearCount,
      reason: `${nearCount} active road obstruction(s) along default corridor. High-ground bypass detour active.`,
    };
  }

  return {
    ward_id: wardId,
    status: "CLEAR",
    points: basePoints,
    active_obstructions: 0,
    reason: "Direct evacuation corridor clear to designated shelter.",
  };
}

export function attachShelterCoords(shelters: ShelterRow[]): ShelterWithCoords[] {
  return shelters.map((s) => {
    const coords = SHELTER_LOCATIONS[s.name] ?? [6.9271, 79.8612];
    return {
      ...s,
      lat: coords[0],
      lng: coords[1],
      available_beds: Math.max(0, s.total_beds - s.occupied_beds),
    };
  });
}
