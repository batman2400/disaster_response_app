import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function probe(name, href, init = {}) {
  try {
    const res = await fetch(href, { ...init, headers: { ...headers, ...init.headers } });
    const text = await res.text();
    console.log(`\n[${name}] ${res.status} ${href}`);
    console.log(text.slice(0, 400));
  } catch (err) {
    console.log(`\n[${name}] FAIL ${href}`);
    console.log(String(err));
  }
}

await probe("wards", `${url}/rest/v1/wards?select=id&limit=1`);
await probe("pg-meta", `${url}/pg/query`, {
  method: "POST",
  body: JSON.stringify({ query: "select extname from pg_extension" }),
});
await probe("pg-meta-2", `${url}/pg-meta/default/query`, {
  method: "POST",
  body: JSON.stringify({ query: "select 1" }),
});
await probe("mgmt", "https://api.supabase.com/v1/projects/zglnfhgwviuakqpkssex/database/query", {
  method: "POST",
  body: JSON.stringify({ query: "select 1" }),
});
