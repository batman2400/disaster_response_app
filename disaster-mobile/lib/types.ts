export type Role = "CITIZEN" | "FIELD_CREW";

export const ROLES: { id: Role; label: string; route: string }[] = [
  { id: "CITIZEN", label: "Citizen", route: "/citizen/report" },
  { id: "FIELD_CREW", label: "Field Crew", route: "/crew" },
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

export const CATEGORIES: { id: HazardCategory; label: string }[] = [
  { id: "FLOOD", label: "Flood" },
  { id: "BLOCKED_ROAD", label: "Blocked road" },
  { id: "FALLEN_TREE", label: "Fallen tree" },
  { id: "HELP_REQUEST", label: "Help request" },
];

export type HazardStatus =
  | "PENDING"
  | "PUBLISHED"
  | "NEED_INFO"
  | "AREA_ALERT"
  | "COUNCIL_TICKET"
  | "RESOLVED";

export type Urgency = "LOW" | "MEDIUM" | "CRITICAL";

export type WardStatus = "NORMAL" | "WATCH" | "CRITICAL";

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

export const PIN_COLORS: Record<HazardStatus, string> = {
  PENDING: "#9CA3AF",
  PUBLISHED: "#2563EB",
  NEED_INFO: "#F59E0B",
  AREA_ALERT: "#DC2626",
  COUNCIL_TICKET: "#7C3AED",
  RESOLVED: "#16A34A",
};

export const COLOMBO_CENTER = { latitude: 6.9271, longitude: 79.8612 };
