import { clusterCount } from "../db";

/**
 * Check 3 — Cluster (PostGIS, plain code, no AI).
 * Counts other reports within 200m over the last 3 hours via the
 * `check_cluster` RPC (falls back to a haversine scan in memory mode).
 */
export async function checkCluster(lat: number, lng: number): Promise<number> {
  return clusterCount(lat, lng);
}
