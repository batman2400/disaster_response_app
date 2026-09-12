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

export interface SafeCorridor {
  id: string;
  name: string;
  wardId: WardId;
  destinationShelter: string;
  description: string;
  color: string;
  elevatedHighGround: boolean;
  points: [number, number][];
}

export const ARTERIAL_SAFE_CORRIDORS: SafeCorridor[] = [
  {
    id: "corridor_01",
    name: "Nagalagam to Peliyagoda Evacuation Spine",
    wardId: "ward_01",
    destinationShelter: "Peliyagoda Community Centre",
    description: "Northbound evacuation spine leading out of Kelani flood plains via elevated bridge approaches.",
    color: "#10b981",
    elevatedHighGround: true,
    points: [
      [6.9535, 79.8732],
      [6.9605, 79.879],
      [6.965, 79.885],
      [6.9698, 79.8917],
    ],
  },
  {
    id: "corridor_02",
    name: "Baseline Road Elevated Corridor",
    wardId: "ward_02",
    destinationShelter: "Town Hall Relief Bay",
    description: "Primary municipal emergency transit route. Central median elevated, cleared for emergency vehicles.",
    color: "#059669",
    elevatedHighGround: true,
    points: [
      [6.9271, 79.8612],
      [6.921, 79.8624],
      [6.917, 79.863],
      [6.9147, 79.8636],
    ],
  },
  {
    id: "corridor_03",
    name: "Fort Coastal High Ground Artery",
    wardId: "ward_03",
    destinationShelter: "Fort Railway Waiting Hall",
    description: "Direct connection from Pettah commercial district westward toward high-capacity railway shelter hub.",
    color: "#047857",
    elevatedHighGround: false,
    points: [
      [6.9355, 79.85],
      [6.935, 79.846],
      [6.9344, 79.8428],
    ],
  },
  {
    id: "corridor_04",
    name: "Marine Drive to Thimbirigasyaya Route",
    wardId: "ward_02",
    destinationShelter: "Thimbirigasyaya School",
    description: "South Colombo arterial connector bypassing low-lying canal depressions.",
    color: "#10b981",
    elevatedHighGround: true,
    points: [
      [6.912, 79.851],
      [6.902, 79.856],
      [6.892, 79.868],
    ],
  },
];

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

export interface DetourStep {
  instruction: string;
  distanceM: number;
  highlight?: string;
  isHighGround?: boolean;
}

export interface DynamicDetourRoute {
  origin: [number, number];
  destination: [number, number];
  shelterId: string;
  shelterName: string;
  wardId: WardId;
  status: "CLEAR" | "DETOUR_ACTIVE" | "BLOCKED";
  points: [number, number][];
  totalDistanceKm: number;
  estimatedMinutes: number;
  bypassedHazardsCount: number;
  safetyScorePct: number;
  steps: DetourStep[];
  reason: string;
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

/**
 * Finds the closest open shelter with free bed capacity.
 */
export function findNearestSafeShelter(
  origin: [number, number],
  shelters: ShelterWithCoords[],
): ShelterWithCoords | null {
  if (!shelters.length) return null;
  const withBeds = shelters.filter((s) => s.available_beds > 0);
  const candidates = withBeds.length > 0 ? withBeds : shelters;

  let best = candidates[0];
  let minDistance = haversineDistanceM(origin[0], origin[1], best.lat, best.lng);

  for (let i = 1; i < candidates.length; i++) {
    const s = candidates[i];
    const dist = haversineDistanceM(origin[0], origin[1], s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      best = s;
    }
  }

  return best;
}

/**
 * High-ground waypoint relief anchors in Colombo for safe route detours.
 */
const HIGH_GROUND_ANCHORS: { name: string; point: [number, number]; wardId: WardId }[] = [
  { name: "Peliyagoda Bridge Northbound Ramp", point: [6.965, 79.88], wardId: "ward_01" },
  { name: "Baseline Elevated Viaduct Median", point: [6.921, 79.8624], wardId: "ward_02" },
  { name: "Viharamahadevi Park Ridge Hub", point: [6.9147, 79.8636], wardId: "ward_02" },
  { name: "Fort Coastal Railway Embankment", point: [6.935, 79.846], wardId: "ward_03" },
  { name: "Marine Drive Coastal Corridor", point: [6.902, 79.856], wardId: "ward_02" },
];

/**
 * Calculates a dynamic evacuation route from an origin to a shelter,
 * detecting active hazard collisions and routing around blocked or critical flood areas.
 */
export function calculateDynamicShelterDetour(
  origin: [number, number],
  targetShelter: ShelterWithCoords,
  hazards: Array<{
    lat: number;
    lng: number;
    is_road_blocked: boolean;
    status: string;
    category?: string;
    estimated_water_depth_cm?: number | null;
  }>,
): DynamicDetourRoute {
  const destination: [number, number] = [targetShelter.lat, targetShelter.lng];
  const directDistance = haversineDistanceM(origin[0], origin[1], destination[0], destination[1]);

  // Active blocking hazards (road blocked, or depth > 30cm, or area alert)
  const activeObstructions = hazards.filter(
    (h) =>
      (h.is_road_blocked ||
        h.status === "AREA_ALERT" ||
        (typeof h.estimated_water_depth_cm === "number" && h.estimated_water_depth_cm >= 30)) &&
      h.status !== "RESOLVED",
  );

  // Check how many obstructions lie close (within 280m) to the direct vector
  const collidedHazards: typeof activeObstructions = [];
  const segments = 6;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const sampleLat = origin[0] + (destination[0] - origin[0]) * t;
    const sampleLng = origin[1] + (destination[1] - origin[1]) * t;

    for (const h of activeObstructions) {
      if (haversineDistanceM(sampleLat, sampleLng, h.lat, h.lng) < 280) {
        if (!collidedHazards.includes(h)) {
          collidedHazards.push(h);
        }
      }
    }
  }

  // If direct corridor is clear
  if (collidedHazards.length === 0) {
    const midPoint: [number, number] = [
      (origin[0] + destination[0]) / 2,
      (origin[1] + destination[1]) / 2,
    ];
    const points: [number, number][] = [origin, midPoint, destination];
    const distanceKm = Number((directDistance / 1000).toFixed(2));
    const estimatedMinutes = Math.max(3, Math.round((distanceKm / 4.5) * 60)); // ~4.5 km/h walking / evacuation speed

    return {
      origin,
      destination,
      shelterId: targetShelter.id,
      shelterName: targetShelter.name,
      wardId: targetShelter.ward_id,
      status: "CLEAR",
      points,
      totalDistanceKm: distanceKm,
      estimatedMinutes,
      bypassedHazardsCount: 0,
      safetyScorePct: 98,
      steps: [
        {
          instruction: `Proceed along direct municipal access route toward ${targetShelter.name}`,
          distanceM: Math.round(directDistance * 0.5),
        },
        {
          instruction: `Approach safe staging perimeter and enter ${targetShelter.name}`,
          distanceM: Math.round(directDistance * 0.5),
        },
      ],
      reason: "Direct municipal access route is clear of active floods and road closures.",
    };
  }

  // Detour required: find the best high-ground relief anchor that minimizes deviation
  let bestAnchor = HIGH_GROUND_ANCHORS[0];
  let bestDistance = Infinity;

  for (const anchor of HIGH_GROUND_ANCHORS) {
    const toAnchor = haversineDistanceM(origin[0], origin[1], anchor.point[0], anchor.point[1]);
    const fromAnchor = haversineDistanceM(anchor.point[0], anchor.point[1], destination[0], destination[1]);
    const totalDist = toAnchor + fromAnchor;

    // Check if anchor is clear of collided hazards
    const anchorClear = collidedHazards.every(
      (h) => haversineDistanceM(anchor.point[0], anchor.point[1], h.lat, h.lng) > 300,
    );

    if (anchorClear && totalDist < bestDistance) {
      bestDistance = totalDist;
      bestAnchor = anchor;
    }
  }

  // Compose detour path
  const detourMid1: [number, number] = [
    origin[0] * 0.4 + bestAnchor.point[0] * 0.6,
    origin[1] * 0.4 + bestAnchor.point[1] * 0.6,
  ];
  const detourMid2: [number, number] = [
    bestAnchor.point[0] * 0.5 + destination[0] * 0.5,
    bestAnchor.point[1] * 0.5 + destination[1] * 0.5,
  ];

  const points: [number, number][] = [origin, detourMid1, bestAnchor.point, detourMid2, destination];
  const totalDistanceKm = Number((bestDistance / 1000).toFixed(2));
  const estimatedMinutes = Math.max(5, Math.round((totalDistanceKm / 4.2) * 60));

  return {
    origin,
    destination,
    shelterId: targetShelter.id,
    shelterName: targetShelter.name,
    wardId: targetShelter.ward_id,
    status: "DETOUR_ACTIVE",
    points,
    totalDistanceKm,
    estimatedMinutes,
    bypassedHazardsCount: collidedHazards.length,
    safetyScorePct: 92,
    steps: [
      {
        instruction: `Divert away from low-lying flooded route; head toward high ground`,
        distanceM: Math.round(haversineDistanceM(origin[0], origin[1], detourMid1[0], detourMid1[1])),
      },
      {
        instruction: `Follow elevated median corridor via ${bestAnchor.name} (bypassing ${collidedHazards.length} impassable roadblock${collidedHazards.length > 1 ? "s" : ""})`,
        distanceM: Math.round(haversineDistanceM(detourMid1[0], detourMid1[1], bestAnchor.point[0], bestAnchor.point[1])),
        isHighGround: true,
        highlight: bestAnchor.name,
      },
      {
        instruction: `Descend safe access ramp into ${targetShelter.name} relief gate`,
        distanceM: Math.round(haversineDistanceM(bestAnchor.point[0], bestAnchor.point[1], destination[0], destination[1])),
      },
    ],
    reason: `Bypassing ${collidedHazards.length} active road blockage(s) & deep flood pool(s). Dynamic high-ground bypass active via ${bestAnchor.name}.`,
  };
}
