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

const serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log("1. Testing real-time cross-device broadcast channel...");
let broadcastReceived = false;

const subChannel = anonClient.channel("safe-registry");
subChannel
  .on("broadcast", { event: "new-check-in" }, (msg) => {
    console.log("   [DEVICE B - ANON] Received real-time broadcast for new post!");
    console.log("   Name:", msg.payload.full_name);
    console.log("   Message:", msg.payload.message);
    broadcastReceived = true;
  })
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      console.log("   Device B subscribed to 'safe-registry' channel");

      // Now simulate Device A posting a new check-in
      const pubChannel = serviceClient.channel("safe-registry");
      pubChannel.subscribe(async (pubStatus) => {
        if (pubStatus === "SUBSCRIBED") {
          console.log("   Device A posting 'I Am Safe' message...");
          const testRecord = {
            id: `safe_test_${Date.now()}`,
            full_name: "Amara Perera",
            contact_masked: "077 *** 5544",
            status: "SAFE_HOME",
            message: "Water levels dropping near Wellawatte, family safe and dry upstairs.",
            family_count: 3,
            vulnerabilities: ["ELDERLY"],
            created_at: new Date().toISOString(),
          };

          // Broadcast
          await pubChannel.send({
            type: "broadcast",
            event: "new-check-in",
            payload: testRecord,
          });

          // Upload to persistent cloud storage
          const { data: currentDl } = await serviceClient.storage.from("safe-registry").download("check_ins.json");
          let currentList = [];
          if (currentDl) {
            try { currentList = JSON.parse(await currentDl.text()); } catch {}
          }
          const updatedList = [testRecord, ...currentList.filter(r => r.id !== testRecord.id)];
          const { error: upErr } = await serviceClient.storage
            .from("safe-registry")
            .upload("check_ins.json", Buffer.from(JSON.stringify(updatedList, null, 2)), {
              contentType: "application/json",
              upsert: true,
            });

          console.log("   Cloud storage updated:", upErr ? upErr.message : "SUCCESS (persisted to Supabase)");

          // Verify read from cloud storage
          const { data: readDl } = await serviceClient.storage.from("safe-registry").download("check_ins.json");
          const readList = JSON.parse(await readDl.text());
          const found = readList.find(r => r.id === testRecord.id);
          console.log("   Read back from cloud storage:", found ? `Found "${found.full_name}" with message "${found.message}"` : "NOT FOUND");

          setTimeout(() => {
            console.log("\nBroadcast received by Device B:", broadcastReceived ? "YES (INSTANT CROSS-DEVICE SYNC WORKING)" : "NO");
            process.exit(broadcastReceived && found ? 0 : 1);
          }, 800);
        }
      });
    }
  });
