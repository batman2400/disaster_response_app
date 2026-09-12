import type { WardId } from "./types";

/**
 * Trim-tier "safe routes" — PLAN.md: "rendered as static polylines rather
 * than computed". These are hand-picked, illustrative waypoints from each
 * ward's hazard hotspot toward its nearest shelter, not a routing result.
 * Do not wire a directions API here; that's the out-of-scope stretch goal.
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
