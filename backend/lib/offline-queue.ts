"use client";

import type { ReportRequest, ReportResponse } from "./types";
import { safeFetchJson } from "./image";

export interface OfflineReport extends ReportRequest {
  id: string;
  queued_at: string;
  retry_count: number;
  last_error?: string;
}

const DB_NAME = "fender_offline_db";
const STORE_NAME = "pending_reports";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in this environment"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineReport(report: Omit<OfflineReport, "id" | "queued_at" | "retry_count">): Promise<OfflineReport> {
  const db = await openDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: OfflineReport = {
    ...report,
    id,
    queued_at: new Date().toISOString(),
    retry_count: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineReports(): Promise<OfflineReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineReport(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export async function syncSingleReport(report: OfflineReport): Promise<ReportResponse> {
  const response = await fetch("/api/report?mode=fast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat: report.lat,
      lng: report.lng,
      ward_id: report.ward_id,
      category: report.category,
      photo_base64: report.photo_base64,
      help_request: report.help_request,
      description: report.description,
      reporter_id: report.reporter_id,
      audio_base64: report.audio_base64,
      audio_mime: report.audio_mime,
    }),
  });

  const res = await safeFetchJson<ReportResponse>(response, "Sync failed");
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Server responded with ${response.status}`);
  }

  await removeOfflineReport(report.id);
  return res.data;
}

export async function syncAllOfflineReports(
  onProgress?: (synced: number, total: number) => void,
): Promise<{ success: number; failed: number; results: ReportResponse[] }> {
  const reports = await getOfflineReports();
  if (!reports.length) return { success: 0, failed: 0, results: [] };

  let success = 0;
  let failed = 0;
  const results: ReportResponse[] = [];

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    try {
      const res = await syncSingleReport(report);
      results.push(res);
      success++;
    } catch (err) {
      console.warn(`Failed to sync offline report ${report.id}:`, err);
      failed++;
    }
    onProgress?.(i + 1, reports.length);
  }

  return { success, failed, results };
}

export function setupAutoSync(onSyncComplete?: (count: number) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    console.log("[OfflineQueue] Device connected online. Checking offline reports queue...");
    const { success } = await syncAllOfflineReports();
    if (success > 0) {
      onSyncComplete?.(success);
    }
  };

  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
