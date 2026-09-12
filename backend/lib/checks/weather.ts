import { listWards } from "../db";
import type { CheckSource, WardId } from "../types";

export interface WeatherCheckResult {
  weather_supported: boolean;
  rainfall_mm: number | null;
  river_level_pct: number | null;
  detail: string;
  source: CheckSource;
}

/**
 * Check 2 — Weather (plain code, no AI).
 * Trips when ward telemetry crosses the locked thresholds.
 */
export async function checkWeather(wardId: WardId): Promise<WeatherCheckResult> {
  const wards = await listWards();
  const ward = wards.find((item) => item.id === wardId);
  if (!ward) {
    return {
      weather_supported: false,
      rainfall_mm: null,
      river_level_pct: null,
      detail: "Ward not found in telemetry table.",
      source: "code",
    };
  }
  const weather_supported = ward.rainfall_mm > 40.0 || ward.river_level_pct > 75.0;
  return {
    weather_supported,
    rainfall_mm: ward.rainfall_mm,
    river_level_pct: ward.river_level_pct,
    detail: weather_supported
      ? `Rain ${ward.rainfall_mm}mm / river ${ward.river_level_pct}% — threshold crossed.`
      : `Rain ${ward.rainfall_mm}mm / river ${ward.river_level_pct}% — below 40mm / 75%.`,
    source: "code",
  };
}
