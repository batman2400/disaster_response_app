import { listWards } from "../db";
import { fetchLiveWardTelemetry } from "../weather-service";
import type { CheckSource, WardId } from "../types";

export interface WeatherCheckResult {
  weather_supported: boolean;
  rainfall_mm: number | null;
  river_level_pct: number | null;
  detail: string;
  source: CheckSource | "open-meteo";
}

/**
 * Check 2 — Weather (live Open-Meteo telemetry with local database fallback).
 * Trips when ward rainfall > 40mm or river gauge > 75%.
 */
export async function checkWeather(wardId: WardId): Promise<WeatherCheckResult> {
  // First attempt live Open-Meteo telemetry
  const live = await fetchLiveWardTelemetry(wardId);
  if (live) {
    const weather_supported = live.rainfall_mm > 40.0 || live.river_level_pct > 75.0;
    return {
      weather_supported,
      rainfall_mm: live.rainfall_mm,
      river_level_pct: live.river_level_pct,
      detail: weather_supported
        ? `Live Open-Meteo: Rain ${live.rainfall_mm}mm / river ${live.river_level_pct}% — threshold crossed.`
        : `Live Open-Meteo: Rain ${live.rainfall_mm}mm / river ${live.river_level_pct}% — below 40mm / 75%.`,
      source: "open-meteo",
    };
  }

  // Fallback to database or in-memory ward table
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
      ? `Telemetry: Rain ${ward.rainfall_mm}mm / river ${ward.river_level_pct}% — threshold crossed.`
      : `Telemetry: Rain ${ward.rainfall_mm}mm / river ${ward.river_level_pct}% — below 40mm / 75%.`,
    source: "code",
  };
}
