import { getAiSettings, listHazards, saveAiSettings, saveHazard } from "./db";
import type {
  AiSettings,
  BannedReporter,
  HazardRow,
  RetuneLogEntry,
  RoadClosureCorridor,
  WardId,
} from "./types";

const globalAdmin = globalThis as typeof globalThis & {
  __bannedReporters?: Map<string, BannedReporter>;
  __retuneLogs?: RetuneLogEntry[];
  __corridorOverrides?: Map<string, { status: "OPEN" | "CLOSED"; reason?: string; closed_at?: string }>;
};

// Seed initial banned reporters for demonstration
const initialBanned: BannedReporter[] = [
  {
    id: "rep-hoax-091",
    device_label: "Samsung Galaxy A52 (Colombo 03)",
    ip_address: "112.134.82.19",
    reason: "Submitted multiple indoor/stock photos claiming flash flood emergencies.",
    banned_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    flagged_reports_count: 4,
  },
  {
    id: "rep-spam-104",
    device_label: "Apple iPhone 12 (Ward 01)",
    ip_address: "175.157.44.8",
    reason: "Automated spam test submitting duplicate reports in Nagalagam Street.",
    banned_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    flagged_reports_count: 7,
  },
];

const initialRetuneLogs: RetuneLogEntry[] = [
  {
    id: "retune-001",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    trigger: "OFFICER_OVERRIDE",
    incident_id: "inc-seed-01",
    previous_confirm: 0.67,
    new_confirm: 0.65,
    previous_reject: 0.30,
    new_reject: 0.30,
    note: "Officer confirmed high-water report in Nagalagam St. Nudged confirm threshold down (-0.02) to increase sensitivity during active rainfall.",
  },
  {
    id: "retune-002",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    trigger: "ADMIN_MANUAL",
    previous_confirm: 0.65,
    new_confirm: 0.65,
    previous_reject: 0.30,
    new_reject: 0.30,
    note: "System baseline calibration for monsoon event. Confirm set to 0.65, Reject set to 0.30.",
  },
];

const MASTER_CORRIDORS: Array<{
  id: string;
  ward_id: WardId;
  name: string;
  description: string;
  default_lat: number;
  default_lng: number;
  detour_suggestion: string;
}> = [
  {
    id: "corridor-nagalagam",
    ward_id: "ward_01",
    name: "Nagalagam Street (Kelani River Access Corridor)",
    description: "Primary low-lying riverfront access route between Grandpass and Peliyagoda.",
    default_lat: 6.9535,
    default_lng: 79.8732,
    detour_suggestion: "Divert North via Peliyagoda Bridge towards Kandy Road arterial high ground.",
  },
  {
    id: "corridor-bauddhaloka",
    ward_id: "ward_02",
    name: "Bauddhaloka Mawatha Corridor (Town Hall / Cinnamon Gardens)",
    description: "Key East-West transit corridor linking Borella and Thimbirigasyaya.",
    default_lat: 6.9271,
    default_lng: 79.8612,
    detour_suggestion: "Reroute traffic via Havelock Road / High Level Road through Town Hall Relief corridor.",
  },
  {
    id: "corridor-olcott",
    ward_id: "ward_03",
    name: "Olcott Mawatha & Pettah Fort Commercial Corridor",
    description: "High-density transport gateway outside Fort Railway Station.",
    default_lat: 6.9355,
    default_lng: 79.85,
    detour_suggestion: "Divert buses via D.R. Wijewardena Mawatha toward Lake House Bypass.",
  },
  {
    id: "corridor-baseline",
    ward_id: "ward_01",
    name: "Base Line Road (Orugodawatta Flyover Junction)",
    description: "Major north-south arterial connector prone to heavy canal overflow.",
    default_lat: 6.945,
    default_lng: 79.879,
    detour_suggestion: "Use Port Access Elevated Expressway or Prince of Wales Avenue.",
  },
];

function getBannedMap(): Map<string, BannedReporter> {
  if (!globalAdmin.__bannedReporters) {
    const map = new Map<string, BannedReporter>();
    for (const b of initialBanned) {
      map.set(b.id, b);
    }
    globalAdmin.__bannedReporters = map;
  }
  return globalAdmin.__bannedReporters;
}

function getRetuneLogs(): RetuneLogEntry[] {
  if (!globalAdmin.__retuneLogs) {
    globalAdmin.__retuneLogs = [...initialRetuneLogs];
  }
  return globalAdmin.__retuneLogs;
}

function getCorridorOverrides(): Map<string, { status: "OPEN" | "CLOSED"; reason?: string; closed_at?: string }> {
  if (!globalAdmin.__corridorOverrides) {
    globalAdmin.__corridorOverrides = new Map();
  }
  return globalAdmin.__corridorOverrides;
}

/* ========================================================================
 * 1. MODERATION & FALSE REPORTERS
 * ======================================================================== */

export async function listBannedReporters(): Promise<BannedReporter[]> {
  return Array.from(getBannedMap().values()).sort(
    (a, b) => new Date(b.banned_at).getTime() - new Date(a.banned_at).getTime(),
  );
}

export async function isReporterBanned(reporterId: string): Promise<boolean> {
  if (!reporterId) return false;
  return getBannedMap().has(reporterId);
}

export async function banReporter(
  reporterId: string,
  deviceLabel = "Unknown Device",
  reason = "Submitted false or unverified hazard reports.",
): Promise<BannedReporter> {
  const banned: BannedReporter = {
    id: reporterId,
    device_label: deviceLabel,
    reason,
    banned_at: new Date().toISOString(),
    flagged_reports_count: 1,
  };
  getBannedMap().set(reporterId, banned);
  return banned;
}

export async function unbanReporter(reporterId: string): Promise<boolean> {
  return getBannedMap().delete(reporterId);
}

export async function listFlaggedReports(): Promise<HazardRow[]> {
  const hazards = await listHazards();
  // Return reports that were marked NEED_INFO with low confidence or where photo was suspicious
  return hazards.filter((h) => {
    if (h.status === "RESOLVED") return false;
    const lowConfidence = h.confidence_score < 0.40;
    const isSuspicious =
      h.description?.toLowerCase().includes("test") ||
      h.description?.toLowerCase().includes("hoax") ||
      (h.trace && h.trace.steps.some((s) => s.id === "image" && !s.passed));
    return lowConfidence || isSuspicious;
  });
}

/* ========================================================================
 * 2. ROAD CLOSURES MANAGER
 * ======================================================================== */

export async function listRoadCorridors(): Promise<RoadClosureCorridor[]> {
  const hazards = await listHazards();
  const overrides = getCorridorOverrides();

  return MASTER_CORRIDORS.map((c) => {
    const override = overrides.get(c.id);
    // Also check if any active hazard at or near this corridor has is_road_blocked = true
    const activeHazardClosure = hazards.find(
      (h) =>
        h.ward_id === c.ward_id &&
        h.is_road_blocked &&
        h.status !== "RESOLVED" &&
        Math.abs(h.lat - c.default_lat) < 0.015 &&
        Math.abs(h.lng - c.default_lng) < 0.015,
    );

    const isClosed = override ? override.status === "CLOSED" : Boolean(activeHazardClosure);
    const reason =
      override?.reason ||
      (activeHazardClosure ? `${activeHazardClosure.category}: ${activeHazardClosure.description || "Active hazard obstruction"}` : undefined);
    const closed_at = override?.closed_at || activeHazardClosure?.created_at;

    return {
      id: c.id,
      ward_id: c.ward_id,
      name: c.name,
      description: c.description,
      status: isClosed ? "CLOSED" : "OPEN",
      reason,
      closed_at,
      detour_suggestion: c.detour_suggestion,
      incident_id: activeHazardClosure?.id,
    };
  });
}

export async function toggleCorridorClosure(
  corridorId: string,
  close: boolean,
  reason = "Municipal precautionary road closure due to flood risk.",
): Promise<RoadClosureCorridor> {
  const corridor = MASTER_CORRIDORS.find((c) => c.id === corridorId);
  if (!corridor) throw new Error(`Corridor ${corridorId} not found`);

  const overrides = getCorridorOverrides();
  const now = new Date().toISOString();

  if (close) {
    overrides.set(corridorId, { status: "CLOSED", reason, closed_at: now });
    // Also insert or update a high-priority hazard so public map / safe routes react
    const closureIncident: HazardRow = {
      id: `closure-${corridorId}`,
      lat: corridor.default_lat,
      lng: corridor.default_lng,
      ward_id: corridor.ward_id,
      category: "BLOCKED_ROAD",
      description: `[MUNICIPAL CLOSURE] ${corridor.name} is temporarily closed by city administration. ${reason}`,
      photo_url: null,
      status: "AREA_ALERT",
      urgency: "CRITICAL",
      confidence_score: 1.0,
      is_road_blocked: true,
      confirmations_count: 5,
      created_at: now,
      resolved_at: null,
      closure_photo_url: null,
      officer_note: `Emergency closure declared by System Admin. ${reason}`,
    };
    await saveHazard(closureIncident);
  } else {
    overrides.set(corridorId, { status: "OPEN" });
    // Lift closure on existing hazard if present
    const existing = await listHazards();
    const match = existing.find((h) => h.id === `closure-${corridorId}`);
    if (match) {
      await saveHazard({
        ...match,
        status: "RESOLVED",
        is_road_blocked: false,
        resolved_at: now,
        officer_note: `${match.officer_note || ""} | Closure lifted by System Admin at ${new Date().toLocaleTimeString()}.`,
      });
    }
  }

  const updated = (await listRoadCorridors()).find((c) => c.id === corridorId);
  return updated!;
}

/* ========================================================================
 * 3. AI RETUNE ENGINE & THRESHOLD AUDIT
 * ======================================================================== */

export async function listRetuneLogs(): Promise<RetuneLogEntry[]> {
  return [...getRetuneLogs()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function recordRetuneLog(
  entry: Omit<RetuneLogEntry, "id" | "timestamp">,
): Promise<RetuneLogEntry> {
  const newLog: RetuneLogEntry = {
    id: `retune-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  getRetuneLogs().unshift(newLog);
  // Keep last 30 logs in memory
  if (globalAdmin.__retuneLogs && globalAdmin.__retuneLogs.length > 30) {
    globalAdmin.__retuneLogs.length = 30;
  }
  return newLog;
}

export async function updateAiThresholds(
  confirmThreshold: number,
  rejectThreshold: number,
  note = "Manual administrative calibration",
): Promise<{ settings: AiSettings; log: RetuneLogEntry }> {
  const current = await getAiSettings();

  const clampedConfirm = Math.max(0.35, Math.min(0.95, Number(confirmThreshold.toFixed(2))));
  const clampedReject = Math.max(0.10, Math.min(0.50, Number(rejectThreshold.toFixed(2))));

  const newSettings: AiSettings = {
    confirm_threshold: clampedConfirm,
    reject_threshold: clampedReject,
  };

  await saveAiSettings(newSettings);

  const log = await recordRetuneLog({
    trigger: "ADMIN_MANUAL",
    previous_confirm: current.confirm_threshold,
    new_confirm: clampedConfirm,
    previous_reject: current.reject_threshold,
    new_reject: clampedReject,
    note,
  });

  return { settings: newSettings, log };
}
