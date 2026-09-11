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

const { data: existing } = await supabase.storage.listBuckets();
console.log("buckets", existing?.map((b) => b.name));

if (!existing?.some((b) => b.name === "hazard-photos")) {
  const { data, error } = await supabase.storage.createBucket("hazard-photos", {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  console.log("createBucket", data, error);
} else {
  console.log("hazard-photos already exists");
}

const { data: pub, error: pubErr } = await supabase.storage.updateBucket("hazard-photos", {
  public: true,
});
console.log("updateBucket", pub, pubErr);
