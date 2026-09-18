import type { WardId } from "./types";
import { compressImage, safeFetchJson } from "./image";

export { compressImage, safeFetchJson };

export const COLOMBO_CENTER: [number, number] = [6.9271, 79.8612];

export const WARD_CENTERS: Record<WardId, [number, number]> = {
  ward_01: [6.9535, 79.8732],
  ward_02: [6.894, 79.868],
  ward_03: [6.9356, 79.848],
};

export const DEMO_GPS = { lat: 6.9535, lng: 79.8732 };

/** Typical flooded-city response speed used for crew ETAs. */
const FLOOD_RESPONSE_KMH = 18;

export function estimateResponseEta(
  from: [number, number] | null | undefined,
  to: [number, number],
  fallbackLabel = "—",
): { label: string; minutes: number | null; km: number | null; fromGps: boolean } {
  if (!from) {
    return { label: fallbackLabel, minutes: null, km: null, fromGps: false };
  }
  const km = haversineKm(from, to);
  const minutes = Math.max(5, Math.round((km / FLOOD_RESPONSE_KMH) * 60));
  return { label: `${minutes} min`, minutes, km, fromGps: true };
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestWard(lat: number, lng: number): WardId {
  let best: WardId = "ward_01";
  let bestKm = Number.POSITIVE_INFINITY;
  for (const [id, center] of Object.entries(WARD_CENTERS) as [WardId, [number, number]][]) {
    const km = haversineKm([lat, lng], center);
    if (km < bestKm) {
      best = id;
      bestKm = km;
    }
  }
  return best;
}

export async function readFileAsDataUrl(file: File) {
  // If in browser and the file is an image, compress it automatically to prevent HTTP 413
  const isImage =
    typeof window !== "undefined" &&
    (file.type?.startsWith("image/") || /\.(jpe?g|png|webp|heic|bmp)$/i.test(file.name));

  if (isImage) {
    try {
      return await compressImage(file);
    } catch (err) {
      console.warn("Client image compression fallback triggered:", err);
    }
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

