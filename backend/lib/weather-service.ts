import { getSupabase } from "./supabase";
import { wards as memoryWards } from "./store";
import type { WardId, WardRow, WardStatus } from "./types";

export const WARD_COORDINATES: Record<WardId, { lat: number; lng: number; name: string; isRiverBasin: boolean }> = {
  ward_01: {
    lat: 6.9536,
    lng: 79.8786,
    name: "Nagalagam Street (Kelani River Basin)",
    isRiverBasin: true,
  },
  ward_02: {
    lat: 6.8942,
    lng: 79.8712,
    name: "Thimbirigasyaya / Town Hall",
    isRiverBasin: false,
  },
  ward_03: {
    lat: 6.9366,
    lng: 79.8492,
    name: "Pettah / Colombo Fort",
    isRiverBasin: false,
  },
};

export interface LiveWardWeather {
  ward_id: WardId;
  name: string;
  rainfall_mm: number;
  river_level_pct: number;
  status: WardStatus;
  temperature_c?: number;
  wind_speed_kmh?: number;
  source: "open-meteo" | "cache" | "database";
  updated_at: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let liveWeatherCache: { timestamp: number; data: Map<WardId, LiveWardWeather> } | null = null;

function computeStatus(rainfall_mm: number, river_level_pct: number): WardStatus {
  if (rainfall_mm >= 60 || river_level_pct >= 80) return "CRITICAL";
  if (rainfall_mm >= 30 || river_level_pct >= 50) return "WATCH";
  return "NORMAL";
}

async function fetchOpenMeteoData(lat: number, lng: number, isRiverBasin: boolean) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,rain,wind_speed_10m&daily=precipitation_sum&past_days=1&forecast_days=1`;
  
  const weatherPromise = fetch(weatherUrl, { next: { revalidate: 300 } })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  let floodPromise: Promise<any> = Promise.resolve(null);
  if (isRiverBasin) {
    const floodUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge`;
    floodPromise = fetch(floodUrl, { next: { revalidate: 300 } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  const [weatherRes, floodRes] = await Promise.all([weatherPromise, floodPromise]);
  return { weatherRes, floodRes };
}

export async function fetchLiveWardTelemetry(wardId: WardId): Promise<LiveWardWeather | null> {
  const coord = WARD_COORDINATES[wardId];
  if (!coord) return null;

  // Check cache first
  const now = Date.now();
  if (liveWeatherCache && now - liveWeatherCache.timestamp < CACHE_TTL_MS) {
    const cached = liveWeatherCache.data.get(wardId);
    if (cached) return cached;
  }

  try {
    const { weatherRes, floodRes } = await fetchOpenMeteoData(coord.lat, coord.lng, coord.isRiverBasin);
    if (!weatherRes) return null;

    // Daily precipitation accumulation or current precipitation
    const dailyArr = weatherRes.daily?.precipitation_sum;
    const dailyAccum = Array.isArray(dailyArr) && dailyArr.length > 0
      ? dailyArr[dailyArr.length - 1] ?? 0
      : 0;
    const currentPrecip = weatherRes.current?.precipitation ?? 0;
    const rainfall_mm = Math.max(Math.round(dailyAccum * 10) / 10, currentPrecip);

    // River discharge level mapping (for Kelani river basin)
    let river_level_pct = 15.0;
    if (coord.isRiverBasin && floodRes?.daily?.river_discharge) {
      const discharges = floodRes.daily.river_discharge;
      const discharge = Array.isArray(discharges) && discharges.length > 0 ? discharges[0] : 0;
      // Normal Kelani discharge is 2-25 m³/s; alert is 80 m³/s; critical flood is 150+ m³/s
      river_level_pct = Math.min(100, Math.max(12, Math.round(15 + (discharge / 150) * 65)));
    } else {
      // Non-river wards have minor storm drain runoff proportional to rainfall
      river_level_pct = Math.min(100, Math.max(10, Math.round(10 + (rainfall_mm / 60) * 40)));
    }

    const status = computeStatus(rainfall_mm, river_level_pct);
    const liveItem: LiveWardWeather = {
      ward_id: wardId,
      name: coord.name,
      rainfall_mm,
      river_level_pct,
      status,
      temperature_c: weatherRes.current?.temperature_2m,
      wind_speed_kmh: weatherRes.current?.wind_speed_10m,
      source: "open-meteo",
      updated_at: new Date().toISOString(),
    };

    if (!liveWeatherCache || now - liveWeatherCache.timestamp >= CACHE_TTL_MS) {
      liveWeatherCache = { timestamp: now, data: new Map() };
    }
    liveWeatherCache.data.set(wardId, liveItem);
    return liveItem;
  } catch (err) {
    console.warn("[weather-service] failed to fetch from open-meteo:", err);
    return null;
  }
}

/**
 * Fetches all Colombo wards from Open-Meteo and updates Supabase + in-memory store.
 */
export async function syncAllWardsLiveWeather(): Promise<LiveWardWeather[]> {
  const wardIds = Object.keys(WARD_COORDINATES) as WardId[];
  const results: LiveWardWeather[] = [];
  const supabase = getSupabase();

  await Promise.all(
    wardIds.map(async (id) => {
      const live = await fetchLiveWardTelemetry(id);
      if (live) {
        results.push(live);

        // Update in-memory store
        const mem = memoryWards.find((w) => w.id === id);
        if (mem) {
          mem.rainfall_mm = live.rainfall_mm;
          mem.river_level_pct = live.river_level_pct;
          mem.status = live.status;
        }

        // Update Supabase if connected
        if (supabase) {
          await supabase
            .from("wards")
            .update({
              rainfall_mm: live.rainfall_mm,
              river_level_pct: live.river_level_pct,
              status: live.status,
            })
            .eq("id", id);
        }
      }
    }),
  );

  return results;
}
