import type { WardId } from "./types";

/**
 * Illustrative waypoints from each ward's hazard hotspot toward its nearest shelter.
 */
export const SAFE_ROUTES: Record<WardId, { latitude: number; longitude: number }[]> = {
  ward_01: [
    { latitude: 6.9535, longitude: 79.8732 }, // Nagalagam St hazard hotspot
    { latitude: 6.9605, longitude: 79.879 },
    { latitude: 6.9698, longitude: 79.8917 }, // toward Peliyagoda Community Centre
  ],
  ward_02: [
    { latitude: 6.9271, longitude: 79.8612 }, // Bauddhaloka Mawatha hazard hotspot
    { latitude: 6.921, longitude: 79.8624 },
    { latitude: 6.9147, longitude: 79.8636 }, // toward Town Hall Relief Bay
  ],
  ward_03: [
    { latitude: 6.9355, longitude: 79.85 }, // Pettah hazard hotspot
    { latitude: 6.935, longitude: 79.846 },
    { latitude: 6.9344, longitude: 79.8428 }, // toward Fort Railway Waiting Hall
  ],
};

export const DETOUR_ROUTES: Record<WardId, { latitude: number; longitude: number }[]> = {
  ward_01: [
    { latitude: 6.9535, longitude: 79.8732 },
    { latitude: 6.959, longitude: 79.869 },
    { latitude: 6.965, longitude: 79.88 },
    { latitude: 6.9698, longitude: 79.8917 },
  ],
  ward_02: [
    { latitude: 6.9271, longitude: 79.8612 },
    { latitude: 6.923, longitude: 79.856 },
    { latitude: 6.918, longitude: 79.859 },
    { latitude: 6.9147, longitude: 79.8636 },
  ],
  ward_03: [
    { latitude: 6.9355, longitude: 79.85 },
    { latitude: 6.937, longitude: 79.846 },
    { latitude: 6.9344, longitude: 79.8428 },
  ],
};

export interface DynamicRouteResult {
  ward_id: WardId;
  status: "CLEAR" | "COMPROMISED";
  points: { latitude: number; longitude: number }[];
  active_obstructions: number;
  reason: string;
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeDynamicRoute(
  wardId: WardId,
  hazards: Array<{
    lat: number;
    lng: number;
    is_road_blocked: boolean;
    status: string;
    category?: string;
    urgency?: string;
    estimated_water_depth_cm?: number | null;
  }>,
): DynamicRouteResult {
  const basePoints = SAFE_ROUTES[wardId] || [];
  const blocked = hazards.filter((h) => {
    if (h.status === "RESOLVED") return false;
    const isBlocked = Boolean(h.is_road_blocked);
    const isDeep = typeof h.estimated_water_depth_cm === "number" && h.estimated_water_depth_cm >= 20;
    const isCritical = h.urgency === "CRITICAL" || h.status === "AREA_ALERT";
    const isHazardType = h.category === "BLOCKED_ROAD" || h.category === "ELECTRICAL_HAZARD";
    return isBlocked || isDeep || isCritical || isHazardType;
  });

  let nearCount = 0;
  for (const pt of basePoints) {
    for (const h of blocked) {
      if (distanceM(pt.latitude, pt.longitude, h.lat, h.lng) < 300) {
        nearCount++;
      }
    }
  }

  if (nearCount > 0) {
    return {
      ward_id: wardId,
      status: "COMPROMISED",
      points: DETOUR_ROUTES[wardId] || basePoints,
      active_obstructions: nearCount,
      reason: `${nearCount} flood/road obstacle(s) detected. High-ground bypass detour active.`,
    };
  }

  return {
    ward_id: wardId,
    status: "CLEAR",
    points: basePoints,
    active_obstructions: 0,
    reason: "Direct route to shelter is clear.",
  };
}
