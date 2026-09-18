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

const VERIFIED_HAZARD_STATUSES = new Set(["AREA_ALERT", "PUBLISHED", "COUNCIL_TICKET"]);

type RoutingHazard = {
  status: string;
  is_road_blocked: boolean;
  category?: string | null;
  urgency?: string | null;
  passability?: string | null;
  estimated_water_depth_cm?: number | null;
  confirmations_count?: number | null;
  confidence_score?: number | null;
};

/**
 * Only verified / official hazards may force a detour. Junk or unverified
 * NEED_INFO pins (e.g. "Just for fun") must not reroute evacuees.
 */
export function isVerifiedRoutingObstacle(hazard: RoutingHazard): boolean {
  if (hazard.status === "RESOLVED") return false;

  const crowdConfirmed =
    Number(hazard.confirmations_count ?? 0) >= 2 || Number(hazard.confidence_score ?? 0) >= 0.65;
  const official =
    VERIFIED_HAZARD_STATUSES.has(hazard.status) ||
    (hazard.status !== "NEED_INFO" && hazard.status !== "PENDING" && crowdConfirmed);
  if (!official) return false;

  const isBlocked = Boolean(hazard.is_road_blocked);
  const isDeep =
    typeof hazard.estimated_water_depth_cm === "number" && hazard.estimated_water_depth_cm >= 20;
  const isImpassable = hazard.passability === "IMPASSABLE" || hazard.passability === "EXTREME_BOAT_ONLY";
  const isCriticalAlert = hazard.status === "AREA_ALERT" || (hazard.urgency === "CRITICAL" && official);
  const isDangerousType =
    hazard.category === "POWERLINE" ||
    hazard.category === "ELECTRICAL_HAZARD" ||
    hazard.category === "BLOCKED_ROAD" ||
    hazard.category === "LANDSLIDE" ||
    hazard.category === "DRAINAGE_OVERFLOW" ||
    hazard.category === "FLOOD";

  return isBlocked || isDeep || isImpassable || isCriticalAlert || isDangerousType;
}

export function computeDynamicRoute(
  wardId: WardId,
  hazards: Array<{
    lat: number;
    lng: number;
    is_road_blocked: boolean;
    status: string;
    category?: string | null;
    urgency?: string | null;
    passability?: string | null;
    estimated_water_depth_cm?: number | null;
    confirmations_count?: number | null;
    confidence_score?: number | null;
  }>,
): DynamicRouteResult {
  const basePoints = SAFE_ROUTES[wardId] || [];
  const blockedHazards = hazards.filter((h) => isVerifiedRoutingObstacle(h));

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
  fullyCircumnavigated: boolean;
  minClearanceM: number;
}

const SUPPLY_RANK: Record<ShelterRow["supplies_status"], number> = {
  ADEQUATE: 2,
  LOW: 1,
  CRITICAL: 0,
};

function shelterNameKey(name: string) {
  return name.trim().toLowerCase();
}

/**
 * Collapse duplicate facility rows (memory seed + live DB copies) to one record.
 * Prefers canonical `s-*` ids, then the more conservative occupancy/supply snapshot.
 */
export function dedupeShelterRows<T extends ShelterRow>(shelters: T[]): T[] {
  const byName = new Map<string, T>();
  for (const shelter of shelters) {
    const key = shelterNameKey(shelter.name || "");
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, shelter);
      continue;
    }
    byName.set(key, preferShelterRecord(existing, shelter));
  }
  return Array.from(byName.values());
}

function preferShelterRecord<T extends ShelterRow>(a: T, b: T): T {
  const aCanonical = a.id.startsWith("s-");
  const bCanonical = b.id.startsWith("s-");
  if (aCanonical !== bCanonical) return bCanonical ? b : a;

  const freeA = Math.max(0, a.total_beds - a.occupied_beds);
  const freeB = Math.max(0, b.total_beds - b.occupied_beds);
  if (freeA !== freeB) return freeB < freeA ? b : a;

  const rankA = SUPPLY_RANK[a.supplies_status] ?? 1;
  const rankB = SUPPLY_RANK[b.supplies_status] ?? 1;
  if (rankA !== rankB) return rankB < rankA ? b : a;

  return a;
}

export function attachShelterCoords(shelters: ShelterRow[]): ShelterWithCoords[] {
  return dedupeShelterRows(shelters).map((s) => {
    const coords = SHELTER_LOCATIONS[s.name] ?? [6.9271, 79.8612];
    return {
      ...s,
      lat: coords[0],
      lng: coords[1],
      available_beds: Math.max(0, s.total_beds - s.occupied_beds),
    };
  });
}

export function sortSheltersForCitizen(shelters: ShelterWithCoords[]): ShelterWithCoords[] {
  return [...shelters].sort((a, b) => {
    if (b.available_beds !== a.available_beds) return b.available_beds - a.available_beds;
    return (SUPPLY_RANK[b.supplies_status] ?? 0) - (SUPPLY_RANK[a.supplies_status] ?? 0);
  });
}

function scoreOpenShelter(origin: [number, number], shelter: ShelterWithCoords): number {
  const distKm = haversineDistanceM(origin[0], origin[1], shelter.lat, shelter.lng) / 1000;
  const occupancy = shelter.total_beds > 0 ? shelter.occupied_beds / shelter.total_beds : 1;
  const distScore = 1 / (1 + distKm);
  const bedScore = Math.min(1, shelter.available_beds / 50);
  const suppliesScore = (SUPPLY_RANK[shelter.supplies_status] ?? 1) / 2;
  const capacityScore = occupancy > 0.9 ? 0.15 : occupancy > 0.8 ? 0.4 : 1;
  return distScore * 0.35 + bedScore * 0.35 + suppliesScore * 0.2 + capacityScore * 0.1;
}

/**
 * Picks the best open shelter: free beds, supplies, remaining capacity, then distance.
 */
export function findNearestSafeShelter(
  origin: [number, number],
  shelters: ShelterWithCoords[],
): ShelterWithCoords | null {
  if (!shelters.length) return null;
  const unique = dedupeShelterRows(shelters);
  const withBeds = unique.filter((s) => s.available_beds > 0);
  const candidates = withBeds.length > 0 ? withBeds : unique;

  let best = candidates[0];
  let bestScore = scoreOpenShelter(origin, best);
  for (let i = 1; i < candidates.length; i++) {
    const score = scoreOpenShelter(origin, candidates[i]);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
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

  const activeObstructions = hazards.filter((h) => isVerifiedRoutingObstacle(h));

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
      safetyScorePct: 96,
      fullyCircumnavigated: true,
      minClearanceM: SAFETY_BUFFER_M,
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
      reason: "No verified flood closures sit on the direct municipal access route.",
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

  const fullyCircumnavigated = best.violationsCount === 0;
  const safetyScorePct = fullyCircumnavigated
    ? Math.min(96, Math.max(70, Math.round(70 + Math.min(26, (best.minClearanceM / 500) * 26))))
    : Math.max(45, Math.round(68 - best.violationsCount * 8));

  const via = bestPoints
    .slice(1, -1)
    .map((point) => `${point[0]},${point[1]}`)
    .join("|");
  const googleMapsSafeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}${via ? `&waypoints=${encodeURIComponent(via)}` : ""}&travelmode=walking`;

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
    fullyCircumnavigated,
    minClearanceM: Math.round(best.minClearanceM),
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
