import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
}

const env = loadEnv(resolve(import.meta.dirname, "../.env.local"));
const mobile = loadEnv(resolve(import.meta.dirname, "../../disaster-mobile/.env"));

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, mobile.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const before = await service.from("wards").select("rainfall_mm").eq("id", "ward_03").single();
console.log("before", before.data);

const attempt = await anon
  .from("wards")
  .update({ rainfall_mm: 999 })
  .eq("id", "ward_03")
  .select("rainfall_mm");
console.log("anon update data", attempt.data, "error", attempt.error);

const after = await service.from("wards").select("rainfall_mm").eq("id", "ward_03").single();
console.log("after", after.data);

if (after.data.rainfall_mm === 999) {
  console.log("FAIL real write succeeded");
  await service.from("wards").update({ rainfall_mm: 8 }).eq("id", "ward_03");
} else {
  console.log("OK  RLS blocked the write (no row returned)");
}
