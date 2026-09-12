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

export type CheckSource = "gemini" | "mock" | "fallback" | "code";

export type TraceStepId = "image" | "weather" | "cluster" | "location" | "risk" | "aggregator";

export interface TraceStep {
  id: TraceStepId;
  name: string;
  passed: boolean;
  detail: string;
  latency_ms: number;
  source: CheckSource;
  confidence?: number;
  extra?: Record<string, unknown>;
}

export interface PipelineTrace {
  started_at: string;
  finished_at: string;
  total_ms: number;
  inferred?: boolean;
  steps: TraceStep[];
  checks: ReportChecks;
  verdict: {
    status: HazardStatus;
    urgency: Urgency;
    confidence_score: number;
    is_road_blocked: boolean;
    reasoning: string;
    source: CheckSource;
    latency_ms: number;
  };
}

export type TraceEventTone = "slate" | "cyan" | "purple" | "emerald" | "crimson" | "amber";

export interface TraceEvent {
  at: string;
  topic: string;
  message: string;
  tone: TraceEventTone;
}

export interface ReportResponse {
  incident_id: string;
  status: HazardStatus;
  urgency: Urgency;
  confidence_score: number;
  is_road_blocked: boolean;
  checks: ReportChecks;
  reasoning: string;
  trace?: PipelineTrace;
}

export type OfficerAction =
  | "override"
  | "confirm"
  | "reject"
  | "crowdsource"
  | "dispatch"
  | "detour"
  | "assign";

export interface OfficerLogEntry {
  at: string;
  action: OfficerAction;
  note: string;
  status: HazardStatus;
}

export interface OverrideRequest {
  incident_id: string;
  new_status: HazardStatus;
  officer_note: string;
  action?: OfficerAction;
}

export interface ResolveRequest {
  incident_id: string;
  closure_photo_base64: string;
}

export interface AssignRequest {
  incident_id: string;
  shelter_id: string;
  beds?: number;
  note?: string;
}

export interface ShelterUpdateRequest {
  shelter_id: string;
  occupied_beds?: number;
  supplies_status?: SuppliesStatus;
}

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
  officer_note?: string;
  officer_log?: OfficerLogEntry[];
  dispatched_at?: string | null;
  trace?: PipelineTrace | null;
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

export type ReplayPhase = "idle" | "running" | "completed";

export type ReplayEventType = "system" | "warn" | "critical" | "alert" | "success";

export interface ReplayEvent {
  at: string;
  clock: string;
  message: string;
  type: ReplayEventType;
  rainfall_mm: number;
  river_level_pct: number;
  status: WardStatus;
}

export interface ReplayState {
  phase: ReplayPhase;
  ward_id: WardId;
  tick: number;
  total: number;
  started_at: string | null;
  finished_at: string | null;
  last_tick_at: string | null;
  clock: string;
  interval_ms: number;
  events: ReplayEvent[];
}
