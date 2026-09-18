import { json, options } from "@/lib/cors";
import { getStoredCheckIns, persistCheckIn } from "@/lib/safe-registry";
import type { SafeCheckIn, SafeStatus, VulnerabilityFlag, WardId } from "@/lib/types";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

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

  const allRecords = await getStoredCheckIns();
  let results = [...allRecords];

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
    total: allRecords.length,
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

  await persistCheckIn(newRecord);

  return json({
    success: true,
    check_in: newRecord,
  });
}
