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

async function check(name, fn) {
  try {
    const result = await fn();
    console.log(`OK  ${name}`);
    if (result !== undefined) console.log("   ", JSON.stringify(result));
  } catch (err) {
    console.log(`FAIL ${name}`);
    console.log("   ", err.message ?? err);
  }
}

await check("wards", async () => {
  const { data, error } = await supabase.from("wards").select("id,status,rainfall_mm,river_level_pct").order("id");
  if (error) throw error;
  return data;
});

await check("shelters", async () => {
  const { data, error } = await supabase.from("shelters").select("name,ward_id,total_beds,occupied_beds");
  if (error) throw error;
  return { count: data.length, names: data.map((row) => row.name) };
});

await check("hazards", async () => {
  const { data, error } = await supabase
    .from("hazards")
    .select("id,category,status,lat,lng,location")
    .order("created_at");
  if (error) throw error;
  return data.map((row) => ({
    category: row.category,
    status: row.status,
    hasLocation: Boolean(row.location),
    lat: row.lat,
    lng: row.lng,
  }));
});

await check("ai_settings", async () => {
  const { data, error } = await supabase.from("ai_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
});

await check("check_cluster 150m", async () => {
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("check_cluster", {
    report_lat: 6.9535,
    report_lng: 79.8732,
    radius_meters: 200,
    time_limit: since,
  });
  if (error) throw error;
  return { count: data.length, categories: data.map((row) => row.category) };
});

await check("check_cluster 5km away", async () => {
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("check_cluster", {
    report_lat: 6.9,
    report_lng: 79.8,
    radius_meters: 200,
    time_limit: since,
  });
  if (error) throw error;
  return { count: data.length };
});

const mobileEnv = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../../disaster-mobile/.env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

await check("anon can read wards", async () => {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, mobileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.from("wards").select("id");
  if (error) throw error;
  return data.map((row) => row.id);
});

await check("anon cannot write wards", async () => {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, mobileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.from("wards").update({ rainfall_mm: 1 }).eq("id", "ward_03");
  if (!error) throw new Error("anon was able to write wards");
  return error.message;
});
