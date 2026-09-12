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
import { parseTrace } from "./trace";
import type { AiSettings, HazardRow, PipelineTrace, ReplayState, ShelterRow, WardId, WardRow, WardStatus } from "./types";

const globalCache = globalThis as typeof globalThis & {
  __hazardTraces?: Map<string, PipelineTrace>;
};
const traceCache = (globalCache.__hazardTraces ??= new Map<string, PipelineTrace>());

function rememberTrace(id: string, trace: PipelineTrace | null | undefined) {
  if (trace) traceCache.set(id, trace);
}

function withCachedTrace(row: HazardRow): HazardRow {
  return { ...row, trace: row.trace ?? traceCache.get(row.id) ?? null };
}

function asHazard(row: Record<string, unknown>): HazardRow {
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
    ...officerFieldsFromStored(row.officer_note, row.status as HazardRow["status"], {
      officer_log: row.officer_log,
      dispatched_at: row.dispatched_at,
    }),
    trace:
      parseTrace(row.trace) ??
      memoryGetHazard(String(row.id))?.trace ??
      traceCache.get(String(row.id)) ??
      null,
    summary: (row.summary as string | null) ?? memoryGetHazard(String(row.id))?.summary ?? null,
    detected_language:
      (row.detected_language as string | null) ??
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
  if (!supabase) return memoryShelters;
  const { data, error } = await supabase.from("shelters").select("*");
  if (error || !data) return memoryShelters;
  return data as ShelterRow[];
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
  if (
    OFFICER_NOTE_COLUMN_EXISTS &&
    (row.officer_note !== undefined || row.officer_log !== undefined || row.dispatched_at !== undefined)
  ) {
    payload.officer_note = serializeOfficerRow(row);
  }
  if (row.trace !== undefined) {
    payload.trace = row.trace;
  }
  const { error } = await supabase.from("hazards").upsert(payload);
  if (error) {
    const missingTrace = /trace/i.test(error.message) && payload.trace !== undefined;
    if (missingTrace) {
      delete payload.trace;
      const retry = await supabase.from("hazards").upsert(payload);
      if (retry.error) console.error("saveHazard", retry.error.message);
      else console.warn("saveHazard: hazards.trace column missing — apply supabase/apply.sql");
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
