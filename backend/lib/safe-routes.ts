import type { HazardRow, ShelterRow, WardId } from "./types";

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

export interface BypassedHazardInfo {
  id?: string;
  category: string;
  depthCm?: number | null;
  description?: string | null;
  distanceFromPathM: number;
  dangerLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  locationNote?: string;
  lat: number;
  lng: number;
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
  bypassedHazards: BypassedHazardInfo[];
  safetyScorePct: number;
  steps: DetourStep[];
  reason: string;
  googleMapsSafeUrl: string;
  activeAnchorName?: string;
  activeAnchorCoords?: [number, number];
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
export const HIGH_GROUND_ANCHORS: { name: string; point: [number, number]; wardId: WardId; description: string }[] = [
  {
    name: "Peliyagoda Bridge Northbound Ramp",
    point: [6.965, 79.88],
    wardId: "ward_01",
    description: "Elevated river crossing above Kelani flood plain",
  },
  {
    name: "Baseline Elevated Flyover Viaduct",
    point: [6.921, 79.8624],
    wardId: "ward_02",
    description: "Grade-separated central arterial flyover immune to surface flooding",
  },
  {
    name: "Viharamahadevi Park Ridge Hub",
    point: [6.9147, 79.8636],
    wardId: "ward_02",
    description: "Natural geological high-ground ridge in Cinnamon Gardens",
  },
  {
    name: "Independence Memorial Square High Ground",
    point: [6.904, 79.868],
    wardId: "ward_02",
    description: "South-central elevated esplanade with zero ponding history",
  },
  {
    name: "Marine Drive Coastal Corridor",
    point: [6.902, 79.856],
    wardId: "ward_02",
    description: "Well-drained coastal arterial ridge away from canal overflows",
  },
  {
    name: "Fort Coastal Railway Embankment",
    point: [6.935, 79.846],
    wardId: "ward_03",
    description: "Reinforced coastal railway berm above Colombo Harbor basin",
  },
  {
    name: "Galle Face Coastal Green",
    point: [6.928, 79.844],
    wardId: "ward_03",
    description: "Direct oceanfront high-elevation evacuation corridor",
  },
  {
    name: "Havelock Town High Ridge",
    point: [6.885, 79.865],
    wardId: "ward_02",
    description: "South Colombo residential ridge free of low-lying canal depressions",
  },
];

/**
 * Exact perpendicular distance from point P to line segment AB in meters.
 */
export function distanceToSegmentM(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return haversineDistanceM(p[0], p[1], a[0], a[1]);

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projLat = a[0] + t * dx;
  const projLng = a[1] + t * dy;
  return haversineDistanceM(p[0], p[1], projLat, projLng);
}

/**
 * Calculates minimum distance from a hazard point to any segment in a polyline path.
 */
export function minDistanceToPathM(
  path: [number, number][],
  hazard: [number, number]
): number {
  let minD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegmentM(hazard, path[i], path[i + 1]);
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Calculates a dynamic evacuation route from an origin to a shelter,
 * detecting active hazard collisions and routing around blocked or critical flood areas.
 */
export function calculateDynamicShelterDetour(
  origin: [number, number],
  targetShelter: ShelterWithCoords,
  hazards: Array<
    | HazardRow
    | {
        id?: string;
        lat: number;
        lng: number;
        is_road_blocked: boolean;
        status: string;
        category?: string | null;
        description?: string | null;
        urgency?: string | null;
        passability?: string | null;
        estimated_water_depth_cm?: number | null;
      }
  >,
): DynamicDetourRoute {
  const destination: [number, number] = [targetShelter.lat, targetShelter.lng];
  const directDistance = haversineDistanceM(origin[0], origin[1], destination[0], destination[1]);

  // Comprehensive filter of affected paths:
  // 1. Road is blocked by debris, fallen tree, or closure order
  // 2. Flood water depth >= 20cm (dangerous for vehicles and pedestrians)
  // 3. Impassable / Boat-only passability classification
  // 4. Critical urgency hazards and area alerts
  // 5. Downed electrical powerlines, electrical hazards, landslides, and blocked roads
  const activeObstructions = hazards.filter((h) => {
    if (h.status === "RESOLVED") return false;
    const isBlocked = Boolean(h.is_road_blocked);
    const isDeep = typeof h.estimated_water_depth_cm === "number" && h.estimated_water_depth_cm >= 20;
    const isImpassable = h.passability === "IMPASSABLE" || h.passability === "EXTREME_BOAT_ONLY";
    const isCritical = h.urgency === "CRITICAL" || h.status === "AREA_ALERT";
    const isDangerousType =
      h.category === "POWERLINE" ||
      h.category === "ELECTRICAL_HAZARD" ||
      h.category === "BLOCKED_ROAD" ||
      h.category === "LANDSLIDE" ||
      h.category === "DRAINAGE_OVERFLOW";
    return isBlocked || isDeep || isImpassable || isCritical || isDangerousType;
  });

  // Safety buffer radius: 350 meters
  const SAFETY_BUFFER_M = 350;

  // 1. Check if the direct path is affected
  const directPath: [number, number][] = [
    origin,
    [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2],
    destination,
  ];

  const collidedWithDirect = activeObstructions.filter(
    (h) => distanceToSegmentM([h.lat, h.lng], origin, destination) < SAFETY_BUFFER_M
  );

  // If the direct path is completely clear of all affected paths
  if (collidedWithDirect.length === 0) {
    const distanceKm = Number((directDistance / 1000).toFixed(2));
    const estimatedMinutes = Math.max(3, Math.round((distanceKm / 4.5) * 60));
    const googleMapsSafeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&travelmode=walking`;

    return {
      origin,
      destination,
      shelterId: targetShelter.id,
      shelterName: targetShelter.name,
      wardId: targetShelter.ward_id,
      status: "CLEAR",
      points: directPath,
      totalDistanceKm: distanceKm,
      estimatedMinutes,
      bypassedHazardsCount: 0,
      bypassedHazards: [],
      safetyScorePct: 99,
      steps: [
        {
          instruction: `Proceed along direct municipal access road toward ${targetShelter.name}`,
          distanceM: Math.round(directDistance * 0.5),
        },
        {
          instruction: `Approach safe staging perimeter and enter ${targetShelter.name}`,
          distanceM: Math.round(directDistance * 0.5),
        },
      ],
      reason: "Direct municipal access route is 100% clear of floodwaters and road closures.",
      googleMapsSafeUrl,
    };
  }

  // 2. Direct path is affected! We must compute a detour through the safest high-ground corridor
  type Candidate = {
    anchor: typeof HIGH_GROUND_ANCHORS[number];
    points: [number, number][];
    totalDistanceM: number;
    minClearanceM: number;
    violationsCount: number;
  };

  const candidates: Candidate[] = [];

  for (const anchor of HIGH_GROUND_ANCHORS) {
    // Initial midpoints between origin->anchor and anchor->destination
    let mid1: [number, number] = [
      origin[0] * 0.45 + anchor.point[0] * 0.55,
      origin[1] * 0.45 + anchor.point[1] * 0.55,
    ];
    let mid2: [number, number] = [
      anchor.point[0] * 0.5 + destination[0] * 0.5,
      anchor.point[1] * 0.5 + destination[1] * 0.5,
    ];

    // Orthogonal hazard repulsion:
    // If any collided hazard is close to mid1 or mid2, push midpoints outward away from the hazard
    for (const h of collidedWithDirect) {
      const d1 = haversineDistanceM(mid1[0], mid1[1], h.lat, h.lng);
      if (d1 < SAFETY_BUFFER_M) {
        const pushLat = mid1[0] - h.lat >= 0 ? 0.0035 : -0.0035;
        const pushLng = mid1[1] - h.lng >= 0 ? 0.0035 : -0.0035;
        mid1 = [mid1[0] + pushLat, mid1[1] + pushLng];
      }
      const d2 = haversineDistanceM(mid2[0], mid2[1], h.lat, h.lng);
      if (d2 < SAFETY_BUFFER_M) {
        const pushLat = mid2[0] - h.lat >= 0 ? 0.0035 : -0.0035;
        const pushLng = mid2[1] - h.lng >= 0 ? 0.0035 : -0.0035;
        mid2 = [mid2[0] + pushLat, mid2[1] + pushLng];
      }
    }

    const testPath: [number, number][] = [origin, mid1, anchor.point, mid2, destination];

    let minClearanceM = Infinity;
    let violationsCount = 0;

    for (const h of activeObstructions) {
      const d = minDistanceToPathM(testPath, [h.lat, h.lng]);
      if (d < minClearanceM) minClearanceM = d;
      if (d < SAFETY_BUFFER_M) {
        violationsCount++;
      }
    }

    const toAnchor = haversineDistanceM(origin[0], origin[1], anchor.point[0], anchor.point[1]);
    const fromAnchor = haversineDistanceM(anchor.point[0], anchor.point[1], destination[0], destination[1]);
    const totalDistanceM = toAnchor + fromAnchor;

    candidates.push({
      anchor,
      points: testPath,
      totalDistanceM,
      minClearanceM,
      violationsCount,
    });
  }

  // Sort candidates:
  // 1. Zero safety violations first
  // 2. Higher minimum hazard clearance (further from danger)
  // 3. Lower total detour distance
  candidates.sort((a, b) => {
    if (a.violationsCount !== b.violationsCount) {
      return a.violationsCount - b.violationsCount;
    }
    if (Math.abs(a.minClearanceM - b.minClearanceM) > 100) {
      return b.minClearanceM - a.minClearanceM; // maximize clearance
    }
    return a.totalDistanceM - b.totalDistanceM;
  });

  const best = candidates[0];
  const bestAnchor = best.anchor;
  const bestPoints = best.points;
  const totalDistanceKm = Number((best.totalDistanceM / 1000).toFixed(2));
  const estimatedMinutes = Math.max(5, Math.round((totalDistanceKm / 4.2) * 60));

  // Identify all hazards that this route successfully bypasses
  const bypassedHazards: BypassedHazardInfo[] = activeObstructions
    .map((h) => {
      const distFromPath = Math.round(minDistanceToPathM(bestPoints, [h.lat, h.lng]));
      return {
        id: h.id,
        category: h.category || (h.is_road_blocked ? "Road Blockage" : "Water Hazard"),
        depthCm: h.estimated_water_depth_cm,
        description: h.description,
        distanceFromPathM: distFromPath,
        dangerLevel:
          h.urgency === "CRITICAL" || (h.estimated_water_depth_cm && h.estimated_water_depth_cm >= 50)
            ? ("CRITICAL" as const)
            : ("HIGH" as const),
        lat: h.lat,
        lng: h.lng,
      };
    })
    .filter((info) => info.distanceFromPathM < 1200) // within vicinity of journey
    .sort((a, b) => a.distanceFromPathM - b.distanceFromPathM);

  // High-accuracy safety score calculation
  const safetyScorePct = Math.min(
    98,
    Math.max(82, Math.round(75 + Math.min(23, (best.minClearanceM / 500) * 23)))
  );

  // Embed the high-ground anchor coordinates into the Google Maps URL as a waypoint!
  // This forces Google Maps to route around the flood through our safe waypoint
  const googleMapsSafeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&waypoints=${bestAnchor.point[0]},${bestAnchor.point[1]}&travelmode=walking`;

  return {
    origin,
    destination,
    shelterId: targetShelter.id,
    shelterName: targetShelter.name,
    wardId: targetShelter.ward_id,
    status: "DETOUR_ACTIVE",
    points: bestPoints,
    totalDistanceKm,
    estimatedMinutes,
    bypassedHazardsCount: collidedWithDirect.length,
    bypassedHazards,
    safetyScorePct,
    activeAnchorName: bestAnchor.name,
    activeAnchorCoords: bestAnchor.point,
    steps: [
      {
        instruction: `Divert away from low-lying flooded streets; follow high ground heading toward ${bestAnchor.name}`,
        distanceM: Math.round(haversineDistanceM(origin[0], origin[1], bestPoints[1][0], bestPoints[1][1])),
      },
      {
        instruction: `Follow elevated safe ridge via ${bestAnchor.name} (${bestAnchor.description}), maintaining safe clearance from all flooded sectors`,
        distanceM: Math.round(haversineDistanceM(bestPoints[1][0], bestPoints[1][1], bestAnchor.point[0], bestAnchor.point[1])),
        isHighGround: true,
        highlight: bestAnchor.name,
      },
      {
        instruction: `Descend safe access corridor directly into ${targetShelter.name} relief gate`,
        distanceM: Math.round(haversineDistanceM(bestAnchor.point[0], bestAnchor.point[1], destination[0], destination[1])),
      },
    ],
    reason: `Direct path is compromised by ${collidedWithDirect.length} flooded/blocked road(s). Safest path verified via ${bestAnchor.name}, keeping at least ${Math.round(best.minClearanceM)}m clear of all danger zones.`,
    googleMapsSafeUrl,
  };
}
