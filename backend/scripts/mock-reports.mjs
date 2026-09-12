/**
 * Phase 6 — mock report seeder.
 *
 * Drops a cluster of hazard reports close together in space and time so
 * `check_cluster()` (and the citizen map / officer queue) have something
 * real to find on demo day, without waiting on real citizens to report.
 * Writes straight to Supabase with the service role key — no backend server
 * required to be running.
 *
 * Usage:
 *   node scripts/mock-reports.mjs                                 # 3 FLOOD reports near ward_01
 *   node scripts/mock-reports.mjs --ward=ward_02 --category=FALLEN_TREE --count=2
 *   node scripts/mock-reports.mjs --lat=6.9535 --lng=79.8732 --spread=120 --count=4
 *   node scripts/mock-reports.mjs --clear                         # delete all [mock] rows
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }),
);

const MOCK_TAG = "[mock]";

const WARD_CENTERS = {
  ward_01: { lat: 6.9535, lng: 79.8732 },
  ward_02: { lat: 6.9271, lng: 79.8612 },
  ward_03: { lat: 6.9355, lng: 79.85 },
};

const DESCRIPTIONS = {
  FLOOD: [
    "Waist-deep water rising fast, cars stalled",
    "Road fully submerged, residents wading through",
    "Water still rising near the canal bank",
    "Drain overflow flooding the junction",
  ],
  BLOCKED_ROAD: [
    "Debris blocking both lanes",
    "Landslip has closed the road",
    "Flood debris piled across the junction",
  ],
  FALLEN_TREE: [
    "Large tree down across the road",
    "Branch blocking one lane, power line sagging",
  ],
  HELP_REQUEST: [
    "Family stranded on the roof, needs evacuation",
    "Elderly couple need transport to a shelter",
  ],
};

function jitter(center, maxMeters) {
  // Small-angle approximation: 1 degree latitude ~ 111,320m.
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const r = Math.random() * maxMeters;
  const theta = Math.random() * 2 * Math.PI;
  return {
    lat: center.lat + (r * Math.sin(theta)) / metersPerDegLat,
    lng: center.lng + (r * Math.cos(theta)) / metersPerDegLng,
  };
}

async function clearMocks() {
  const { data, error } = await supabase
    .from("hazards")
    .delete()
    .like("description", `${MOCK_TAG}%`)
    .select("id");
  if (error) {
    console.error("[mock-reports] clear failed:", error.message);
    return false;
  }
  console.log(`[mock-reports] deleted ${data?.length ?? 0} mock rows`);
  return true;
}

async function seed() {
  const wardId = args.ward && WARD_CENTERS[args.ward] ? args.ward : "ward_01";
  const category = args.category && DESCRIPTIONS[args.category] ? args.category : "FLOOD";
  const count = Number(args.count ?? 3);
  const spreadMeters = Number(args.spread ?? 150);
  const center = {
    lat: Number(args.lat ?? WARD_CENTERS[wardId].lat),
    lng: Number(args.lng ?? WARD_CENTERS[wardId].lng),
  };

  const rows = Array.from({ length: count }, (_, i) => {
    const point = i === 0 ? center : jitter(center, spreadMeters);
    const pool = DESCRIPTIONS[category];
    const description = `${MOCK_TAG} ${pool[i % pool.length]}`;
    const isFlood = category === "FLOOD";
    return {
      lat: point.lat,
      lng: point.lng,
      ward_id: wardId,
      category,
      description,
      status: i === 0 && isFlood ? "AREA_ALERT" : "PUBLISHED",
      urgency: isFlood ? "CRITICAL" : "MEDIUM",
      confidence_score: 0.8 + Math.random() * 0.15,
      is_road_blocked: category !== "HELP_REQUEST",
      confirmations_count: Math.floor(Math.random() * 3),
      created_at: new Date().toISOString(),
    };
  });

  const { data, error } = await supabase.from("hazards").insert(rows).select("id,lat,lng,category,status");
  if (error) {
    console.error("[mock-reports] insert failed:", error.message);
    return false;
  }

  console.log(`[mock-reports] seeded ${data.length} ${category} report(s) in ${wardId}:`);
  for (const row of data) {
    console.log(`  ${row.id}  (${row.lat.toFixed(4)}, ${row.lng.toFixed(4)})  ${row.status}`);
  }
  console.log(`[mock-reports] run with --clear to remove all "${MOCK_TAG}" rows.`);
  return true;
}

const ok = args.clear ? await clearMocks() : await seed();
if (!ok) process.exitCode = 1;
