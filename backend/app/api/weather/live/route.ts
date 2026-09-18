import { CORS_HEADERS, json, options } from "@/lib/cors";
import { syncAllWardsLiveWeather, fetchLiveWardTelemetry, WARD_COORDINATES } from "@/lib/weather-service";
import type { WardId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return options();
}

export async function GET() {
  const wardIds = Object.keys(WARD_COORDINATES) as WardId[];
  const weather = await Promise.all(wardIds.map((id) => fetchLiveWardTelemetry(id)));
  return json({
    wards: weather.filter(Boolean),
    timestamp: new Date().toISOString(),
    source: "open-meteo",
  });
}

export async function POST() {
  try {
    const updated = await syncAllWardsLiveWeather();
    return json({
      success: true,
      updated_count: updated.length,
      wards: updated,
      message: "Synchronized live Open-Meteo telemetry with municipal database and dashboard.",
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
}
