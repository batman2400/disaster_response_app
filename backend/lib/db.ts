import { stripDataUrl } from "./gemini";
import { officerFieldsFromStored, serializeOfficerRow } from "./officer-log";
import { getSupabase, HAZARD_BUCKET } from "./supabase";
import {
  aiSettings,
  getHazard as memoryGetHazard,
  listHazards as memoryListHazards,
  getShelter as memoryGetShelter,
  shelters as memoryShelters,
  upsertHazard as memoryUpsert,
  upsertShelter as memoryUpsertShelter,
  wards as memoryWards,
} from "./store";
import { dedupeShelterRows } from "./safe-routes";
import { parseTrace } from "./trace";
import type { AiSettings, HazardRow, PipelineTrace, ReplayState, ShelterRow, WardId, WardRow, WardStatus } from "./types";

const globalCache = globalThis as typeof globalThis & {
  __hazardTraces?: Map<string, PipelineTrace>;
  __hazardAudios?: Map<string, string>;
};
const traceCache = (globalCache.__hazardTraces ??= new Map<string, PipelineTrace>());
const audioCache = (globalCache.__hazardAudios ??= new Map<string, string>());

function rememberTrace(id: string, trace: PipelineTrace | null | undefined) {
  if (trace) traceCache.set(id, trace);
}

function rememberAudio(id: string, audioUrl: string | null | undefined) {
  if (audioUrl) audioCache.set(id, audioUrl);
}

function withCachedTrace(row: HazardRow): HazardRow {
  return {
    ...row,
    trace: row.trace ?? traceCache.get(row.id) ?? null,
    audio_url: row.audio_url ?? audioCache.get(row.id) ?? null,
  };
}

function asHazard(row: Record<string, unknown>): HazardRow {
  let rawTrace: Record<string, unknown> | null = null;
  if (row.trace && typeof row.trace === "object") {
    rawTrace = row.trace as Record<string, unknown>;
  } else if (typeof row.trace === "string") {
    try {
      rawTrace = JSON.parse(row.trace);
    } catch {}
  }
  return {
    id: String(row.id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    ward_id: row.ward_id as HazardRow["ward_id"],
    category: row.category as HazardRow["category"],
    description: (row.description as string | null) ?? null,
    photo_url: (row.photo_url as string | null) ?? null,
    status: row.status as HazardRow["status"],
    urgency: row.urgency as HazardRow["urgency"],
    confidence_score: Number(row.confidence_score ?? 0),
    is_road_blocked: Boolean(row.is_road_blocked),
    confirmations_count: Number(row.confirmations_count ?? 0),
    created_at: String(row.created_at),
    resolved_at: (row.resolved_at as string | null) ?? null,
    closure_photo_url: (row.closure_photo_url as string | null) ?? null,
    audio_url:
      (row.audio_url as string | null) ??
      (rawTrace?.audio_url as string | null) ??
      ((rawTrace?.extra as Record<string, unknown> | undefined)?.audio_url as string | null) ??
      memoryGetHazard(String(row.id))?.audio_url ??
      audioCache.get(String(row.id)) ??
      null,
    ...officerFieldsFromStored(row.officer_note, row.status as HazardRow["status"], {
      officer_log: row.officer_log,
      dispatched_at: row.dispatched_at,
    }),
    trace:
      parseTrace(row.trace) ??
      memoryGetHazard(String(row.id))?.trace ??
      traceCache.get(String(row.id)) ??
      null,
    summary:
      (row.summary as string | null) ??
      (rawTrace?.summary as string | null) ??
      memoryGetHazard(String(row.id))?.summary ??
      null,
    detected_language:
      (row.detected_language as string | null) ??
      (rawTrace?.detected_language as string | null) ??
      memoryGetHazard(String(row.id))?.detected_language ??
      null,
    resolution_verified:
      (row.resolution_verified as boolean | undefined) ??
      memoryGetHazard(String(row.id))?.resolution_verified ??
      undefined,
    resolution_notes:
      (row.resolution_notes as string | null) ??
      memoryGetHazard(String(row.id))?.resolution_notes ??
      null,
    assigned_crew_id:
      (row.assigned_crew_id as string | null) ??
      memoryGetHazard(String(row.id))?.assigned_crew_id ??
      null,
    assigned_crew_name:
      (row.assigned_crew_name as string | null) ??
      memoryGetHazard(String(row.id))?.assigned_crew_name ??
      null,
    parent_incident_id:
      (row.parent_incident_id as string | null) ??
      (rawTrace?.parent_incident_id as string | null) ??
      memoryGetHazard(String(row.id))?.parent_incident_id ??
      null,
    corroborations_count:
      Number(row.corroborations_count ?? rawTrace?.corroborations_count ?? memoryGetHazard(String(row.id))?.corroborations_count ?? 0),
    corroborating_reports:
      (row.corroborating_reports as HazardRow["corroborating_reports"]) ??
      (rawTrace?.corroborating_reports as HazardRow["corroborating_reports"]) ??
      memoryGetHazard(String(row.id))?.corroborating_reports ??
      [],
    estimated_water_depth_cm:
      (row.estimated_water_depth_cm as number | null) ??
      (rawTrace?.estimated_water_depth_cm as number | null) ??
      null,
    depth_confidence:
      (row.depth_confidence as HazardRow["depth_confidence"]) ??
      (rawTrace?.depth_confidence as HazardRow["depth_confidence"]) ??
      null,
    depth_reference_anchor:
      (row.depth_reference_anchor as string | null) ??
      (rawTrace?.depth_reference_anchor as string | null) ??
      null,
    passability:
      (row.passability as HazardRow["passability"]) ??
      (rawTrace?.passability as HazardRow["passability"]) ??
      null,
  };
}

export async function listWards(): Promise<WardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return memoryWards;
  const { data, error } = await supabase.from("wards").select("*").order("id");
  if (error || !data) return memoryWards;
  return data as WardRow[];
}

export async function listHazards(): Promise<HazardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return memoryListHazards().map(withCachedTrace);
  const { data, error } = await supabase
    .from("hazards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return memoryListHazards().map(withCachedTrace);
  return data.map((row) => asHazard(row as Record<string, unknown>));
}

export async function listShelters(): Promise<ShelterRow[]> {
  const supabase = getSupabase();
  if (!supabase) return dedupeShelterRows(memoryShelters);
  const { data, error } = await supabase.from("shelters").select("*");
  if (error || !data) return dedupeShelterRows(memoryShelters);
  return dedupeShelterRows(data as ShelterRow[]);
}

export async function findShelter(id: string): Promise<ShelterRow | null> {
  const supabase = getSupabase();
  if (!supabase) return memoryGetShelter(id);
  const { data, error } = await supabase.from("shelters").select("*").eq("id", id).maybeSingle();
  if (error || !data) return memoryGetShelter(id);
  return data as ShelterRow;
}

export async function saveShelter(row: ShelterRow) {
  memoryUpsertShelter(row);
  const supabase = getSupabase();
  if (!supabase) return row;
  const { error } = await supabase.from("shelters").upsert({
    id: row.id,
    ward_id: row.ward_id,
    name: row.name,
    total_beds: row.total_beds,
    occupied_beds: row.occupied_beds,
    supplies_status: row.supplies_status,
  });
  if (error) console.error("saveShelter", error.message);
  return row;
}

export async function findHazard(id: string): Promise<HazardRow | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const row = memoryGetHazard(id);
    return row ? withCachedTrace(row) : null;
  }
  const { data, error } = await supabase.from("hazards").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    const row = memoryGetHazard(id);
    return row ? withCachedTrace(row) : null;
  }
  return asHazard(data as Record<string, unknown>);
}

// `supabase/apply.sql`'s `officer_note` column has been applied against the
// live database (confirmed via a direct select on 2026-09-12), so writes can
// safely include it now.
const OFFICER_NOTE_COLUMN_EXISTS = true;

export async function saveHazard(row: HazardRow) {
  rememberTrace(row.id, row.trace);
  rememberAudio(row.id, row.audio_url);
  memoryUpsert(row);
  const supabase = getSupabase();
  if (!supabase) return row;
  const payload: Record<string, unknown> = {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    ward_id: row.ward_id,
    category: row.category,
    description: row.description,
    photo_url: row.photo_url,
    status: row.status,
    urgency: row.urgency,
    confidence_score: row.confidence_score,
    is_road_blocked: row.is_road_blocked,
    confirmations_count: row.confirmations_count,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    closure_photo_url: row.closure_photo_url,
  };
  if (row.audio_url !== undefined) {
    payload.audio_url = row.audio_url;
  }
  if (
    OFFICER_NOTE_COLUMN_EXISTS &&
    (row.officer_note !== undefined || row.officer_log !== undefined || row.dispatched_at !== undefined)
  ) {
    payload.officer_note = serializeOfficerRow(row);
  }
  const traceObj: Record<string, unknown> =
    row.trace && typeof row.trace === "object" ? { ...row.trace } : {};
  if (row.audio_url) traceObj.audio_url = row.audio_url;
  if (row.summary) traceObj.summary = row.summary;
  if (row.detected_language) traceObj.detected_language = row.detected_language;
  if (row.parent_incident_id) traceObj.parent_incident_id = row.parent_incident_id;
  if (row.corroborations_count) traceObj.corroborations_count = row.corroborations_count;
  if (row.corroborating_reports) traceObj.corroborating_reports = row.corroborating_reports;
  if (row.estimated_water_depth_cm !== undefined && row.estimated_water_depth_cm !== null) {
    traceObj.estimated_water_depth_cm = row.estimated_water_depth_cm;
  }
  if (row.depth_confidence !== undefined && row.depth_confidence !== null) {
    traceObj.depth_confidence = row.depth_confidence;
  }
  if (row.depth_reference_anchor !== undefined && row.depth_reference_anchor !== null) {
    traceObj.depth_reference_anchor = row.depth_reference_anchor;
  }
  if (row.passability !== undefined && row.passability !== null) {
    traceObj.passability = row.passability;
  }
  if (Object.keys(traceObj).length > 0) {
    payload.trace = traceObj;
  }
  const { error } = await supabase.from("hazards").upsert(payload);
  if (error) {
    let retried = false;
    if (/audio_url/i.test(error.message) && payload.audio_url !== undefined) {
      delete payload.audio_url;
      retried = true;
    }
    if (/trace/i.test(error.message) && payload.trace !== undefined) {
      delete payload.trace;
      retried = true;
    }
    if (retried) {
      const retry = await supabase.from("hazards").upsert(payload);
      if (retry.error) console.error("saveHazard retry", retry.error.message);
    } else {
      console.error("saveHazard", error.message);
    }
  }
  return row;
}

// Crowdsource quorum: this many confirmations auto-publishes a held report.
const CONFIRM_QUORUM = 3;
const HOLDING_STATUSES = new Set<HazardRow["status"]>(["NEED_INFO", "PENDING"]);

/**
 * Trim-tier NEED_INFO crowdsource confirm — bumps `confirmations_count` and
 * auto-publishes once the quorum is reached, per PLAN.md's "single confirm
 * button" scope (no separate voting UI).
 */
export async function confirmHazard(id: string): Promise<HazardRow | null> {
  const existing = await findHazard(id);
  if (!existing) return null;

  const confirmations_count = existing.confirmations_count + 1;
  const shouldPublish = confirmations_count >= CONFIRM_QUORUM && HOLDING_STATUSES.has(existing.status);
  const updated: HazardRow = {
    ...existing,
    confirmations_count,
    status: shouldPublish ? "PUBLISHED" : existing.status,
  };
  return saveHazard(updated);
}

export async function getAiSettings(): Promise<AiSettings> {
  const supabase = getSupabase();
  if (!supabase) return { ...aiSettings };
  const { data, error } = await supabase
    .from("ai_settings")
    .select("confirm_threshold, reject_threshold")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { ...aiSettings };
  aiSettings.confirm_threshold = Number(data.confirm_threshold);
  aiSettings.reject_threshold = Number(data.reject_threshold);
  return { ...aiSettings };
}

export async function saveAiSettings(settings: AiSettings) {
  aiSettings.confirm_threshold = settings.confirm_threshold;
  aiSettings.reject_threshold = settings.reject_threshold;
  const supabase = getSupabase();
  if (!supabase) return settings;
  await supabase
    .from("ai_settings")
    .update({
      confirm_threshold: settings.confirm_threshold,
      reject_threshold: settings.reject_threshold,
    })
    .eq("id", 1);
  return settings;
}

export async function clusterCount(lat: number, lng: number) {
  const supabase = getSupabase();
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  if (supabase) {
    const { data, error } = await supabase.rpc("check_cluster", {
      report_lat: lat,
      report_lng: lng,
      radius_meters: 200,
      time_limit: since,
    });
    if (!error && Array.isArray(data)) {
      return data.length;
    }
  }
  const rows = await listHazards();
  return rows.filter((row) => {
    if (new Date(row.created_at).getTime() < Date.parse(since)) return false;
    const R = 6371000;
    const dLat = ((row.lat - lat) * Math.PI) / 180;
    const dLng = ((row.lng - lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((row.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))) <= 200;
  }).length;
}

export async function uploadPhoto(id: string, photoBase64: string, kind: "report" | "closure") {
  const supabase = getSupabase();
  if (!supabase || !photoBase64) return null;
  const { mimeType, data } = stripDataUrl(photoBase64);
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `${kind}/${id}.${ext}`;
  const { error } = await supabase.storage.from(HAZARD_BUCKET).upload(path, Buffer.from(data, "base64"), {
    contentType: mimeType,
    upsert: true,
  });
  if (error) {
    console.error("uploadPhoto", error.message);
    return null;
  }
  const { data: pub } = supabase.storage.from(HAZARD_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function uploadAudio(id: string, audioBase64: string, audioMime = "audio/webm"): Promise<string | null> {
  if (!audioBase64) return null;
  rememberAudio(id, audioBase64);
  const supabase = getSupabase();
  if (!supabase) return audioBase64;
  try {
    const { mimeType, data } = stripDataUrl(audioBase64, audioMime);
    const ext = mimeType.includes("mp3")
      ? "mp3"
      : mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("ogg")
          ? "ogg"
          : "webm";
    const path = `audio/${id}.${ext}`;
    const { error } = await supabase.storage.from(HAZARD_BUCKET).upload(path, Buffer.from(data, "base64"), {
      contentType: mimeType,
      upsert: true,
    });
    if (error) {
      return audioBase64;
    }
    const { data: pub } = supabase.storage.from(HAZARD_BUCKET).getPublicUrl(path);
    return pub.publicUrl || audioBase64;
  } catch {
    return audioBase64;
  }
}

export async function updateWardTelemetry(
  id: WardId,
  rainfall_mm: number,
  river_level_pct: number,
  status: WardStatus,
): Promise<WardRow | null> {
  const memory = memoryWards.find((ward) => ward.id === id);
  if (memory) {
    memory.rainfall_mm = rainfall_mm;
    memory.river_level_pct = river_level_pct;
    memory.status = status;
  }

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("wards")
      .update({ rainfall_mm, river_level_pct, status })
      .eq("id", id);
    if (error) {
      console.error("updateWardTelemetry", error.message);
      return memory ?? null;
    }
  }

  return (
    memory ?? {
      id,
      name: id,
      rainfall_mm,
      river_level_pct,
      status,
    }
  );
}

export async function loadReplaySnapshot(): Promise<ReplayState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("ai_settings").select("replay").eq("id", 1).maybeSingle();
  if (error || !data || !("replay" in data) || !data.replay) return null;
  return data.replay as ReplayState;
}

export async function saveReplaySnapshot(state: ReplayState) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("ai_settings").update({ replay: state }).eq("id", 1);
  if (error) {
    console.warn("saveReplaySnapshot:", error.message);
  }
}

export interface BroadcastAlert {
  active: boolean;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  ward_id?: string | null;
  author?: string;
  updated_at: string;
}

let inMemoryBroadcast: BroadcastAlert = {
  active: true,
  message: "Kelani River flood watch: Minor flood threshold reached at Nagalagam St. Low Level Road traffic restricted.",
  severity: "WARNING",
  ward_id: "ward_01",
  author: "CMC Disaster Command",
  updated_at: new Date().toISOString(),
};

export async function loadBroadcastAlert(): Promise<BroadcastAlert> {
  const supabase = getSupabase();
  if (!supabase) return inMemoryBroadcast;
  try {
    const { data, error } = await supabase.from("ai_settings").select("broadcast").eq("id", 1).maybeSingle();
    if (!error && data && "broadcast" in data && data.broadcast) {
      inMemoryBroadcast = data.broadcast as BroadcastAlert;
    }
  } catch {
    // fallback to inMemoryBroadcast
  }
  return inMemoryBroadcast;
}

export async function saveBroadcastAlert(alert: BroadcastAlert): Promise<BroadcastAlert> {
  inMemoryBroadcast = { ...alert, updated_at: new Date().toISOString() };
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("ai_settings").update({ broadcast: inMemoryBroadcast }).eq("id", 1);
      if (error) {
        console.warn("saveBroadcastAlert Supabase update (ignorable if column pending):", error.message);
      }
    } catch (err) {
      console.warn("saveBroadcastAlert err:", err);
    }
  }
  return inMemoryBroadcast;
}

export { listShelterNeeds, createShelterNeed, pledgeShelterNeed } from "./store";


