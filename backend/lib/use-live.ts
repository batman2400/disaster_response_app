"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { officerFieldsFromStored } from "./officer-log";
import { getBrowserSupabase } from "./supabase-browser";
import { parseTrace } from "./trace";
import type { HazardRow, ShelterRow, WardRow } from "./types";

type Identified = { id: string };
type LiveTable = "hazards" | "wards" | "shelters";

function applyChange<T extends Identified>(
  prev: T[],
  eventType: string,
  next: T | null,
  oldId?: string,
): T[] {
  if (eventType === "DELETE") {
    const id = oldId ?? next?.id;
    return id ? prev.filter((row) => row.id !== id) : prev;
  }
  if (!next) return prev;
  return [next, ...prev.filter((row) => row.id !== next.id)];
}

export function mapHazardRow(row: Record<string, unknown>): HazardRow {
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
    trace: parseTrace(row.trace),
  };
}

export function mapWardRow(row: Record<string, unknown>): WardRow {
  return {
    id: row.id as WardRow["id"],
    name: String(row.name),
    rainfall_mm: Number(row.rainfall_mm ?? 0),
    river_level_pct: Number(row.river_level_pct ?? 0),
    status: row.status as WardRow["status"],
  };
}

export function mapShelterRow(row: Record<string, unknown>): ShelterRow {
  return {
    id: String(row.id),
    ward_id: row.ward_id as ShelterRow["ward_id"],
    name: String(row.name),
    total_beds: Number(row.total_beds ?? 0),
    occupied_beds: Number(row.occupied_beds ?? 0),
    supplies_status: row.supplies_status as ShelterRow["supplies_status"],
  };
}

export function sortHazards(rows: HazardRow[]) {
  return [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function sortWards(rows: WardRow[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

export function useLiveRows<T extends Identified>(options: {
  table: LiveTable;
  initial: T[];
  mapRow: (row: Record<string, unknown>) => T;
  fallbackFetch?: () => Promise<T[]>;
  sort?: (rows: T[]) => T[];
}): { rows: T[]; updatedAt: Date; live: boolean; refetch: () => Promise<void> } {
  const { table, initial, mapRow, fallbackFetch, sort } = options;
  const [rows, setRows] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [live, setLive] = useState(false);
  const fallbackRef = useRef(fallbackFetch);
  const mapRef = useRef(mapRow);
  const sortRef = useRef(sort);
  fallbackRef.current = fallbackFetch;
  mapRef.current = mapRow;
  sortRef.current = sort;

  const commit = useCallback((next: T[]) => {
    setRows(sortRef.current ? sortRef.current(next) : next);
    setUpdatedAt(new Date());
  }, []);

  const refetch = useCallback(async () => {
    const client = getBrowserSupabase();
    if (client) {
      const { data, error } = await client.from(table).select("*");
      if (!error && data) {
        commit(data.map((row) => mapRef.current(row as Record<string, unknown>)));
        return;
      }
    }
    if (fallbackRef.current) {
      commit(await fallbackRef.current());
    }
  }, [table, commit]);

  useEffect(() => {
    const client = getBrowserSupabase();
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const safeCommit = (next: T[]) => {
      if (cancelled) return;
      commit(next);
    };

    async function seed() {
      if (client) {
        const { data, error } = await client.from(table).select("*");
        if (!error && data) {
          safeCommit(data.map((row) => mapRef.current(row as Record<string, unknown>)));
          return;
        }
      }
      if (fallbackRef.current) {
        safeCommit(await fallbackRef.current());
      }
    }

    void seed();

    if (!client) {
      if (!fallbackRef.current) return;
      pollId = setInterval(() => {
        void fallbackRef.current?.().then(safeCommit);
      }, 8000);
      return () => {
        cancelled = true;
        if (pollId) clearInterval(pollId);
      };
    }

    const channel = client
      .channel(`live-${table}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const next =
            payload.new && Object.keys(payload.new).length
              ? mapRef.current(payload.new as Record<string, unknown>)
              : null;
          const oldId =
            payload.old && "id" in payload.old ? String((payload.old as { id: unknown }).id) : undefined;
          setRows((prev) => {
            const merged = applyChange(prev, payload.eventType, next, oldId);
            return sortRef.current ? sortRef.current(merged) : merged;
          });
          setUpdatedAt(new Date());
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void fallbackRef.current?.().then(safeCommit);
        }
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [table, commit]);

  return { rows, updatedAt, live, refetch };
}
