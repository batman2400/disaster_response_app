import { clusterCount } from "../db";
import type { CheckSource } from "../types";

export const CLUSTER_RADIUS_M = 200;
export const CLUSTER_WINDOW_HOURS = 3;

export interface ClusterCheckResult {
  cluster_count: number;
  detail: string;
  source: CheckSource;
}

/**
 * Check 3 — Cluster (PostGIS, plain code, no AI).
 * Counts other reports within 200m over the last 3 hours via the
 * `check_cluster` RPC (falls back to a haversine scan in memory mode).
 */
export async function checkCluster(lat: number, lng: number): Promise<ClusterCheckResult> {
  const cluster_count = await clusterCount(lat, lng);
  return {
    cluster_count,
    detail: `ST_DWithin(${CLUSTER_RADIUS_M}m, ${CLUSTER_WINDOW_HOURS}h) found ${cluster_count} report(s).`,
    source: "code",
  };
}
