export type Role =
  | "CITIZEN"
  | "COUNCIL_OFFICER"
  | "FIELD_CREW"
  | "RELIEF_COORDINATOR";

export const ROLES: { id: Role; label: string; route: string }[] = [
  { id: "CITIZEN", label: "Citizen", route: "/citizen/report" },
  { id: "COUNCIL_OFFICER", label: "Council Officer", route: "/officer" },
  { id: "FIELD_CREW", label: "Field Crew", route: "/crew" },
  { id: "RELIEF_COORDINATOR", label: "Relief Coordinator", route: "/relief" },
];

export type WardId = "ward_01" | "ward_02" | "ward_03";

export const WARDS: { id: WardId; name: string }[] = [
  { id: "ward_01", name: "Nagalagam Street (Kelani River Basin)" },
  { id: "ward_02", name: "Thimbirigasyaya / Town Hall" },
  { id: "ward_03", name: "Pettah / Colombo Fort" },
];

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

/** POST /api/report */
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

/** Locked response from POST /api/report */
export interface ReportResponse {
  incident_id: string;
  status: HazardStatus;
  urgency: Urgency;
  confidence_score: number;
  is_road_blocked: boolean;
  checks: ReportChecks;
  reasoning: string;
}

/** POST /api/override */
export interface OverrideRequest {
  incident_id: string;
  new_status: HazardStatus;
  officer_note: string;
}

export interface OverrideResponse {
  incident_id: string;
  status: HazardStatus;
  confirm_threshold: number;
  reject_threshold: number;
}

/** POST /api/resolve */
export interface ResolveRequest {
  incident_id: string;
  closure_photo_base64: string;
}

export interface ResolveResponse {
  incident_id: string;
  status: "RESOLVED";
  is_road_blocked: false;
  resolved_at: string;
}

/** POST /api/confirm — crowdsourced NEED_INFO confirmation, bumps confirmations_count */
export interface ConfirmRequest {
  incident_id: string;
}

export interface ConfirmResponse {
  incident_id: string;
  confirmations_count: number;
  status: HazardStatus;
}

/** Supabase `hazards` row. Use lat/lng — ignore `location`. */
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

export const PIN_COLORS: Record<HazardStatus, string> = {
  PENDING: "#9CA3AF",
  PUBLISHED: "#2563EB",
  NEED_INFO: "#F59E0B",
  AREA_ALERT: "#DC2626",
  COUNCIL_TICKET: "#7C3AED",
  RESOLVED: "#16A34A",
};

export const COLOMBO_CENTER = { latitude: 6.9271, longitude: 79.8612 };
