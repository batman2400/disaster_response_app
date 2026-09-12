/**
 * Phase 6 — "second way in" for the demo.
 *
 * Replays a Colombo rainy day by ticking `wards.rainfall_mm` /
 * `wards.river_level_pct` upward on an interval and flipping `wards.status`
 * through NORMAL -> WATCH -> CRITICAL. Because `wards` is in the
 * `supabase_realtime` publication, every open app screen (weather replay,
 * officer desk, citizen map banner) updates on its own — nobody has to tap
 * anything. This is the "mocked weather/river feed raises area warnings on
 * its own" demo-critical spine item.
 *
 * Usage:
 *   node scripts/replay-rainy-day.mjs                  # default: ~2 min replay, 15s ticks
 *   node scripts/replay-rainy-day.mjs --interval=10     # seconds between ticks
 *   node scripts/replay-rainy-day.mjs --reset           # reset wards to seed values then exit
 *   node scripts/replay-rainy-day.mjs --ward=ward_02    # replay a different ward
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8")
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

const TARGET_WARD = args.ward || "ward_03";
const INTERVAL_MS = Number(args.interval ?? 15) * 1000;

const SEED = {
  ward_01: { name: "Nagalagam Street (Kelani River Basin)", rainfall_mm: 68.0, river_level_pct: 88.0, status: "CRITICAL" },
  ward_02: { name: "Thimbirigasyaya / Town Hall", rainfall_mm: 42.0, river_level_pct: 62.0, status: "WATCH" },
  ward_03: { name: "Pettah / Colombo Fort", rainfall_mm: 8.0, river_level_pct: 15.0, status: "NORMAL" },
};

function statusFor(rainfall_mm, river_level_pct) {
  if (rainfall_mm >= 60 || river_level_pct >= 80) return "CRITICAL";
  if (rainfall_mm >= 30 || river_level_pct >= 50) return "WATCH";
  return "NORMAL";
}

// A storm system rolling over the target ward: rainfall/river climb, then
// the ward tips into WATCH, then CRITICAL — matching the same thresholds
// `checks/weather.ts` uses (rainfall > 40 or river > 75) so a report filed
// mid-replay genuinely trips the weather check on its own.
const TIMELINE = [
  { rainfall_mm: 8, river_level_pct: 15 },
  { rainfall_mm: 18, river_level_pct: 24 },
  { rainfall_mm: 31, river_level_pct: 38 },
  { rainfall_mm: 45, river_level_pct: 55 },
  { rainfall_mm: 58, river_level_pct: 68 },
  { rainfall_mm: 71, river_level_pct: 82 },
  { rainfall_mm: 79, river_level_pct: 91 },
];

async function updateWard(wardId, rainfall_mm, river_level_pct) {
  const status = statusFor(rainfall_mm, river_level_pct);
  const { error } = await supabase
    .from("wards")
    .update({ rainfall_mm, river_level_pct, status })
    .eq("id", wardId);
  if (error) {
    console.error(`[replay] failed to update ${wardId}:`, error.message);
    return null;
  }
  return status;
}

async function reset() {
  for (const [id, ward] of Object.entries(SEED)) {
    await updateWard(id, ward.rainfall_mm, ward.river_level_pct);
  }
  console.log("[replay] wards reset to seed values");
}

async function run() {
  if (args.reset) {
    await reset();
    return;
  }

  if (!SEED[TARGET_WARD]) {
    console.error(`[replay] unknown ward "${TARGET_WARD}" — expected one of ${Object.keys(SEED).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[replay] rolling a storm over ${TARGET_WARD} (${SEED[TARGET_WARD].name})`);
  console.log(`[replay] ${TIMELINE.length} ticks, ${INTERVAL_MS / 1000}s apart — Ctrl+C to stop early`);

  for (let i = 0; i < TIMELINE.length; i++) {
    const { rainfall_mm, river_level_pct } = TIMELINE[i];
    const status = await updateWard(TARGET_WARD, rainfall_mm, river_level_pct);
    console.log(
      `[replay] tick ${i + 1}/${TIMELINE.length} — ${TARGET_WARD} rainfall=${rainfall_mm}mm river=${river_level_pct}% status=${status ?? "ERROR"}`,
    );
    if (i < TIMELINE.length - 1) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }

  console.log("[replay] done. Run again with --reset to restore seed values.");
}

await run();
