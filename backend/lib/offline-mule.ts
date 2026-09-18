"use client";

import type { DataMuleBeacon } from "./types";

const MULE_DB_NAME = "fender_data_mule_vault";
const MULE_STORE_NAME = "collected_beacons";
const MULE_DB_VERSION = 1;

function openMuleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available in this environment"));
    }
    const req = window.indexedDB.open(MULE_DB_NAME, MULE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MULE_STORE_NAME)) {
        db.createObjectStore(MULE_STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMuleBeacon(beacon: DataMuleBeacon): Promise<void> {
  const db = await openMuleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MULE_STORE_NAME, "readwrite");
    const store = tx.objectStore(MULE_STORE_NAME);
    const req = store.put(beacon);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMuleBeacons(): Promise<DataMuleBeacon[]> {
  try {
    const db = await openMuleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MULE_STORE_NAME, "readonly");
      const store = tx.objectStore(MULE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeMuleBeacon(id: string): Promise<void> {
  try {
    const db = await openMuleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MULE_STORE_NAME, "readwrite");
      const store = tx.objectStore(MULE_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export async function clearMuleVault(): Promise<void> {
  try {
    const db = await openMuleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MULE_STORE_NAME, "readwrite");
      const store = tx.objectStore(MULE_STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export async function syncMuleBeacons(crewId?: string): Promise<{ synced: number; failed: number }> {
  const beacons = await getMuleBeacons();
  if (!beacons.length) return { synced: 0, failed: 0 };

  try {
    const res = await fetch("/api/report/mule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beacons, crew_id: crewId }),
    });

    if (!res.ok) throw new Error("Failed to relay mule beacons");
    const payload = (await res.json()) as { synced_count: number };

    // Clean up successfully synced beacons
    for (const beacon of beacons) {
      await removeMuleBeacon(beacon.id);
    }

    return { synced: payload.synced_count || beacons.length, failed: 0 };
  } catch (err) {
    console.error("Data mule relay sync failed:", err);
    return { synced: 0, failed: beacons.length };
  }
}
