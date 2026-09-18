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

console.log("Testing Supabase Cloud Storage connection for safe-registry...");

const { data: buckets } = await supabase.storage.listBuckets();
console.log("Buckets:", buckets?.map(b => b.name));

const { data: file, error: dlErr } = await supabase.storage.from("safe-registry").download("check_ins.json");
if (dlErr) {
  console.log("No existing check_ins.json (will be created on first post):", dlErr.message);
} else {
  const text = await file.text();
  console.log("Existing check_ins.json found! Length:", text.length, "Preview:", text.slice(0, 150));
}

console.log("Safe registry storage test complete.");
