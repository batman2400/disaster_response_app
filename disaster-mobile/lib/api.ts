import { MOCK_HAZARDS, MOCK_SHELTERS, MOCK_WARDS } from "./mock-data";
import type {
  HazardRow,
  OverrideRequest,
  OverrideResponse,
  ReportRequest,
  ReportResponse,
  ResolveRequest,
  ResolveResponse,
  ShelterRow,
  WardRow,
} from "./types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is empty — set it to the backend URL");
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as T;
}

async function get<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function postReport(body: ReportRequest): Promise<ReportResponse> {
  if (!API_URL) {
    return {
      incident_id: `local-${Date.now()}`,
      status: body.category === "FLOOD" ? "AREA_ALERT" : "PUBLISHED",
      urgency: "CRITICAL",
      confidence_score: 0.89,
      is_road_blocked: body.category !== "HELP_REQUEST",
      checks: {
        image_verified: Boolean(body.photo_base64),
        weather_supported: body.ward_id !== "ward_03",
        cluster_count: 3,
        location_matched: true,
        risk_level: "CRITICAL",
      },
      reasoning:
        "Offline mock verdict. Set EXPO_PUBLIC_API_URL to hit the real /api/report pipeline.",
    };
  }
  return post<ReportResponse>("/api/report", body);
}

export function postOverride(body: OverrideRequest) {
  return post<OverrideResponse>("/api/override", body);
}

export function postResolve(body: ResolveRequest) {
  return post<ResolveResponse>("/api/resolve", body);
}

export function fetchHazards() {
  return get<HazardRow[]>("/api/hazards", MOCK_HAZARDS);
}

export function fetchWards() {
  return get<WardRow[]>("/api/wards", MOCK_WARDS);
}

export function fetchShelters() {
  return get<ShelterRow[]>("/api/shelters", MOCK_SHELTERS);
}
