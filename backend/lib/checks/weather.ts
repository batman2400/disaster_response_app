import { listWards } from "../db";
import type { WardId } from "../types";

/**
 * Check 2 — Weather (plain code, no AI).
 * Trips when ward telemetry crosses the locked thresholds.
 */
export async function checkWeather(wardId: WardId): Promise<boolean> {
  const wards = await listWards();
  const ward = wards.find((item) => item.id === wardId);
  if (!ward) return false;
  return ward.rainfall_mm > 40.0 || ward.river_level_pct > 75.0;
}
