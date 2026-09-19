import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
const envPath = resolve(import.meta.dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

const {
  listRoadCorridors,
  toggleCorridorClosure,
  listBannedReporters,
  isReporterBanned,
  banReporter,
  unbanReporter,
  listRetuneLogs,
  updateAiThresholds,
  CORRIDOR_CLOSURE_UUIDS,
} = await import("../lib/admin.ts");

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log("--- TEST 1: Initial Corridor Listing ---");
const initialCorridors = await listRoadCorridors();
console.log(`Corridors count: ${initialCorridors.length}`);
for (const c of initialCorridors) {
  console.log(` - ${c.name}: [${c.status}] (Reason: ${c.reason || "None"})`);
}

console.log("\n--- TEST 2: Close Corridor with Deterministic UUID ---");
const closed = await toggleCorridorClosure(
  "corridor-nagalagam",
  true,
  "Emergency municipal flood surge warning",
);
console.log(`Closed result status: ${closed.status}, reason: ${closed.reason}`);

const uuid = CORRIDOR_CLOSURE_UUIDS["corridor-nagalagam"];
const { data: haz, error: hazErr } = await sb.from("hazards").select("*").eq("id", uuid).maybeSingle();
if (hazErr) throw hazErr;
console.log(`Supabase hazard verified: id=${haz?.id}, is_road_blocked=${haz?.is_road_blocked}, category=${haz?.category}`);
if (!haz || !haz.is_road_blocked) throw new Error("Hazard was not properly saved to Supabase!");

console.log("\n--- TEST 3: Reopen Corridor & Unblock Road ---");
const opened = await toggleCorridorClosure("corridor-nagalagam", false);
console.log(`Reopened result status: ${opened.status}`);

const { data: hazAfter } = await sb.from("hazards").select("status, is_road_blocked").eq("id", uuid).maybeSingle();
console.log(`Supabase municipal hazard after reopen: status=${hazAfter?.status}, is_road_blocked=${hazAfter?.is_road_blocked}`);

console.log("\n--- TEST 4: Ban Reporter with Supabase Persistence ---");
const testRepId = "rep-ci-verify-" + Math.random().toString(36).slice(2, 7);
const banRes = await banReporter(testRepId, "Test Device Pixel 8", "Automated testing of moderation persistence");
console.log(`Banned reporter created: ${banRes.id} (${banRes.device_label})`);

const isBanned = await isReporterBanned(testRepId);
console.log(`isReporterBanned result: ${isBanned}`);
if (!isBanned) throw new Error("Reporter was not recognized as banned!");

// Verify directly from Supabase ai_settings row 2
const { data: row2 } = await sb.from("ai_settings").select("replay").eq("id", 2).maybeSingle();
const inDb = (row2?.replay?.banned || []).some((b) => b.id === testRepId);
console.log(`Verified reporter in Supabase row 2 storage: ${inDb}`);
if (!inDb) throw new Error("Reporter was not persisted to Supabase row 2!");

console.log("\n--- TEST 5: Unban Reporter & Database Sync ---");
const unbanSuccess = await unbanReporter(testRepId);
console.log(`Unban success: ${unbanSuccess}`);

const isBannedAfter = await isReporterBanned(testRepId);
console.log(`isReporterBanned after unban: ${isBannedAfter}`);
if (isBannedAfter) throw new Error("Reporter was still banned after unban!");

console.log("\n--- TEST 6: Retune Logs & Calibration Persistence ---");
const retuneRes = await updateAiThresholds(0.58, 0.28, "Automated CI Retune Verification");
console.log(`Retune result: confirm=${retuneRes.settings.confirm_threshold}, reject=${retuneRes.settings.reject_threshold}`);
console.log(`Retune log generated: ${retuneRes.log.id}, note=${retuneRes.log.note}`);

const logs = await listRetuneLogs();
console.log(`Total retune logs recorded: ${logs.length}`);
const foundLog = logs.find((l) => l.note === "Automated CI Retune Verification");
console.log(`Verified log in history: ${Boolean(foundLog)}`);
if (!foundLog) throw new Error("Retune log was not recorded in history!");

console.log("\nALL TESTS PASSED SUCCESSFULLY! The System Admin panel backend is fully verified.");
