import { getSupabase } from "./supabase";
import type { SafeCheckIn, SafeStatus, VulnerabilityFlag, WardId } from "./types";

export const SEED_CHECK_INS: SafeCheckIn[] = [
  {
    id: "safe_clm_01",
    full_name: "Sunil Jayawardena",
    contact_masked: "077 *** 4821",
    nic_masked: "721****90V",
    status: "IN_SHELTER",
    shelter_id: "peliyagoda_cc",
    shelter_name: "Peliyagoda Community Centre",
    ward_id: "ward_01",
    location_detail: "Nagalagam Street evacuation bay, Hall B",
    family_count: 4,
    vulnerabilities: ["ELDERLY"],
    message: "Family is safe at Peliyagoda shelter. Grandmother received her heart medication from the mobile clinic.",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    verified_by_shelter: true,
  },
  {
    id: "safe_clm_02",
    full_name: "Fathima Rameez",
    contact_masked: "071 *** 9033",
    nic_masked: "885****12V",
    status: "IN_SHELTER",
    shelter_id: "town_hall",
    shelter_name: "Town Hall Relief Bay",
    ward_id: "ward_02",
    location_detail: "Family Medical Tent 03",
    family_count: 3,
    vulnerabilities: ["INFANT", "MEDICAL_INSULIN"],
    message: "Safe at Town Hall with 8-month infant. Red Cross provided baby formula and diaper rations.",
    created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    verified_by_shelter: true,
  },
  {
    id: "safe_clm_03",
    full_name: "Kavinda De Silva",
    contact_masked: "076 *** 2219",
    nic_masked: "951****44V",
    status: "WITH_RELATIVES",
    shelter_id: null,
    shelter_name: null,
    ward_id: "ward_03",
    location_detail: "Evacuated from Pettah to cousin's house in Nugegoda high ground",
    family_count: 2,
    vulnerabilities: [],
    message: "Water entered ground floor of shop, but we evacuated safely. Phone battery 15%, do not worry.",
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    verified_by_shelter: false,
  },
  {
    id: "safe_clm_04",
    full_name: "Sithy Marikkar",
    contact_masked: "075 *** 1184",
    nic_masked: "602****88V",
    status: "IN_SHELTER",
    shelter_id: "kelaniya_temple",
    shelter_name: "Kelaniya Temple Hall",
    ward_id: "ward_01",
    location_detail: "Main hall perimeter",
    family_count: 5,
    vulnerabilities: ["ELDERLY", "WHEELCHAIR"],
    message: "Boat rescue unit extracted my father in wheelchair. Both dry and safe at Kelaniya temple.",
    created_at: new Date(Date.now() - 145 * 60 * 1000).toISOString(),
    verified_by_shelter: true,
  },
  {
    id: "safe_clm_05",
    full_name: "Ravi Chandrasekaran",
    contact_masked: "072 *** 6542",
    nic_masked: "830****21V",
    status: "IN_SHELTER",
    shelter_id: "fort_railway",
    shelter_name: "Fort Railway Waiting Hall",
    ward_id: "ward_03",
    location_detail: "Platform 2 waiting room",
    family_count: 1,
    vulnerabilities: [],
    message: "Stranded commuter, staying overnight at railway shelter until tracks are cleared. All good.",
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    verified_by_shelter: true,
  },
];

const STORAGE_BUCKET = "safe-registry";
const STORAGE_FILE = "check_ins.json";

// In-memory cache to guarantee sub-millisecond local responses
let inMemoryCheckIns: SafeCheckIn[] = [...SEED_CHECK_INS];
let lastCloudFetchTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds

/**
 * Fetch check-ins from cloud storage or PostgreSQL table
 */
export async function getStoredCheckIns(): Promise<SafeCheckIn[]> {
  const now = Date.now();
  if (now - lastCloudFetchTime < CACHE_TTL_MS && inMemoryCheckIns.length > 0) {
    return inMemoryCheckIns;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return inMemoryCheckIns;
  }

  try {
    // 1. Try native PostgreSQL table first if applied
    const { data: tableData, error: tableError } = await supabase
      .from("safe_check_ins")
      .select("*")
      .order("created_at", { ascending: false });

    if (!tableError && tableData && Array.isArray(tableData) && tableData.length > 0) {
      const mapped: SafeCheckIn[] = tableData.map((row) => ({
        id: String(row.id),
        full_name: String(row.full_name),
        contact_masked: String(row.contact_masked),
        nic_masked: row.nic_masked ? String(row.nic_masked) : undefined,
        status: row.status as SafeStatus,
        shelter_id: row.shelter_id ? String(row.shelter_id) : null,
        shelter_name: row.shelter_name ? String(row.shelter_name) : null,
        ward_id: (row.ward_id as WardId) || null,
        location_detail: row.location_detail ? String(row.location_detail) : undefined,
        family_count: Number(row.family_count ?? 1),
        vulnerabilities: Array.isArray(row.vulnerabilities) ? (row.vulnerabilities as VulnerabilityFlag[]) : [],
        message: row.message ? String(row.message) : undefined,
        created_at: String(row.created_at),
        verified_by_shelter: Boolean(row.verified_by_shelter),
      }));

      const existingIds = new Set(mapped.map((r) => r.id));
      const combined = [...mapped, ...SEED_CHECK_INS.filter((s) => !existingIds.has(s.id))];
      inMemoryCheckIns = combined;
      lastCloudFetchTime = now;
      return combined;
    }
  } catch {
    // Table not present yet, continue to cloud storage fallback
  }

  try {
    // 2. Cloud Storage fallback with direct cache-busting to bypass Supabase CDN
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(STORAGE_FILE);
    if (publicUrl) {
      const res = await fetch(`${publicUrl}?t=${now}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text) as SafeCheckIn[];
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((r) => r.id));
          const combined = [...parsed, ...SEED_CHECK_INS.filter((s) => !existingIds.has(s.id))];
          inMemoryCheckIns = combined;
          lastCloudFetchTime = now;
          return combined;
        }
      }
    }
  } catch (storageErr) {
    console.warn("[SafeRegistry] Cloud storage read warning:", storageErr);
  }

  lastCloudFetchTime = now;
  return inMemoryCheckIns;
}

/**
 * Persist a newly submitted SafeCheckIn to Supabase cloud storage and PostgreSQL,
 * and broadcast the event to all active listening clients.
 */
export async function persistCheckIn(record: SafeCheckIn): Promise<void> {
  // Update memory cache immediately
  inMemoryCheckIns = [record, ...inMemoryCheckIns.filter((r) => r.id !== record.id)];
  lastCloudFetchTime = Date.now();

  const supabase = getSupabase();
  if (!supabase) return;

  // 1. Try saving to PostgreSQL table
  try {
    await supabase.from("safe_check_ins").upsert({
      id: record.id,
      full_name: record.full_name,
      contact_masked: record.contact_masked,
      nic_masked: record.nic_masked || null,
      status: record.status,
      shelter_id: record.shelter_id || null,
      shelter_name: record.shelter_name || null,
      ward_id: record.ward_id || null,
      location_detail: record.location_detail || null,
      family_count: record.family_count,
      vulnerabilities: record.vulnerabilities,
      message: record.message || null,
      created_at: record.created_at,
      verified_by_shelter: record.verified_by_shelter ?? false,
    });
  } catch {
    // Table may not exist yet in Postgres
  }

  // 2. Save to Supabase Cloud Storage (with cacheControl: '0' to ensure instant visibility)
  try {
    const dataToSave = inMemoryCheckIns;
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_FILE, Buffer.from(JSON.stringify(dataToSave, null, 2)), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });

    // Also persist individual record file for backup
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(`records/${record.id}.json`, Buffer.from(JSON.stringify(record, null, 2)), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });
  } catch (storageErr) {
    console.warn("[SafeRegistry] Cloud storage upload warning:", storageErr);
  }

  // 3. Broadcast real-time event to all listening devices
  try {
    const channel = supabase.channel("safe-registry");
    await channel.send({
      type: "broadcast",
      event: "new-check-in",
      payload: record,
    });
  } catch (broadcastErr) {
    console.warn("[SafeRegistry] Broadcast warning:", broadcastErr);
  }
}
