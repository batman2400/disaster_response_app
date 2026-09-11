export type WardId = "ward_01" | "ward_02" | "ward_03";

export type HazardCategory =
  | "FLOOD"
  | "BLOCKED_ROAD"
  | "FALLEN_TREE"
  | "HELP_REQUEST";

export type HazardStatus =
  | "PENDING"
  | "PUBLISHED"
  | "NEED_INFO"
  | "AREA_ALERT"
  | "COUNCIL_TICKET"
  | "RESOLVED";

export type Urgency = "LOW" | "MEDIUM" | "CRITICAL";

export type WardStatus = "NORMAL" | "WATCH" | "CRITICAL";

export type SuppliesStatus = "ADEQUATE" | "LOW" | "CRITICAL";

export interface ReportRequest {
  lat: number;
  lng: number;
  ward_id: WardId;
  category: HazardCategory;
  photo_base64: string;
  help_request: boolean;
  description: string;
}

export interface ReportChecks {
  image_verified: boolean;
  weather_supported: boolean;
  cluster_count: number;
  location_matched: boolean;
  risk_level: Urgency;
}

export interface ReportResponse {
  incident_id: string;
  status: HazardStatus;
  urgency: Urgency;
  confidence_score: number;
  is_road_blocked: boolean;
  checks: ReportChecks;
  reasoning: string;
}

export interface OverrideRequest {
  incident_id: string;
  new_status: HazardStatus;
  officer_note: string;
}

export interface ResolveRequest {
  incident_id: string;
  closure_photo_base64: string;
}

export interface HazardRow {
  id: string;
  lat: number;
  lng: number;
  ward_id: WardId;
  category: HazardCategory;
  description: string | null;
  photo_url: string | null;
  status: HazardStatus;
  urgency: Urgency;
  confidence_score: number;
  is_road_blocked: boolean;
  confirmations_count: number;
  created_at: string;
  resolved_at: string | null;
  closure_photo_url: string | null;
  officer_note?: string;
}

export interface WardRow {
  id: WardId;
  name: string;
  rainfall_mm: number;
  river_level_pct: number;
  status: WardStatus;
}

export interface ShelterRow {
  id: string;
  ward_id: WardId;
  name: string;
  total_beds: number;
  occupied_beds: number;
  supplies_status: SuppliesStatus;
}

export interface AiSettings {
  confirm_threshold: number;
  reject_threshold: number;
}
