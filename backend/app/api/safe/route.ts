import { json, options } from "@/lib/cors";
import type { SafeCheckIn, SafeStatus, VulnerabilityFlag, WardId } from "@/lib/types";

export function OPTIONS() {
  return options();
}

// In-memory persistent store with realistic Colombo seed records
const SEED_CHECK_INS: SafeCheckIn[] = [
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

let checkInsStore: SafeCheckIn[] = [...SEED_CHECK_INS];

function maskPhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length >= 7) {
    return `${clean.slice(0, 3)} *** ${clean.slice(-4)}`;
  }
  return "07* *** ****";
}

function maskNic(nic: string): string {
  const clean = nic.trim();
  if (clean.length >= 8) {
    return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
  }
  return clean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const shelter = searchParams.get("shelter") || "ALL";
  const vulnerableOnly = searchParams.get("vulnerable") === "true";

  let results = [...checkInsStore];

  if (q) {
    results = results.filter((item) => {
      const nameMatch = item.full_name.toLowerCase().includes(q);
      const phoneMatch = item.contact_masked.toLowerCase().includes(q);
      const msgMatch = (item.message || "").toLowerCase().includes(q);
      const locMatch = (item.location_detail || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || msgMatch || locMatch;
    });
  }

  if (shelter && shelter !== "ALL") {
    results = results.filter((item) => item.shelter_id === shelter || item.shelter_name === shelter);
  }

  if (vulnerableOnly) {
    results = results.filter((item) => item.vulnerabilities && item.vulnerabilities.length > 0);
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return json({
    total: checkInsStore.length,
    matched: results.length,
    check_ins: results,
  });
}

export async function POST(request: Request) {
  let body: {
    full_name: string;
    contact_phone: string;
    nic?: string;
    status: SafeStatus;
    shelter_id?: string;
    shelter_name?: string;
    ward_id?: WardId;
    location_detail?: string;
    family_count?: number;
    vulnerabilities?: VulnerabilityFlag[];
    message?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (!body.full_name || !body.full_name.trim()) {
    return json({ error: "Full name is required" }, 400);
  }
  if (!body.contact_phone || !body.contact_phone.trim()) {
    return json({ error: "Contact phone number is required" }, 400);
  }

  const id = `safe_clm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newRecord: SafeCheckIn = {
    id,
    full_name: body.full_name.trim(),
    contact_masked: maskPhone(body.contact_phone),
    nic_masked: body.nic ? maskNic(body.nic) : undefined,
    status: body.status || "SAFE_HOME",
    shelter_id: body.shelter_id || null,
    shelter_name: body.shelter_name || null,
    ward_id: body.ward_id || null,
    location_detail: body.location_detail || undefined,
    family_count: Math.max(1, body.family_count || 1),
    vulnerabilities: body.vulnerabilities || [],
    message: body.message?.trim() || undefined,
    created_at: new Date().toISOString(),
    verified_by_shelter: Boolean(body.shelter_id),
  };

  checkInsStore = [newRecord, ...checkInsStore];

  return json({
    success: true,
    check_in: newRecord,
  });
}
