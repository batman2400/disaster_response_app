export type WardId = "ward_01" | "ward_02" | "ward_03";

export type HazardCategory =
  | "FLOOD"
  | "ELECTRICAL_HAZARD"
  | "FALLEN_TREE"
  | "BLOCKED_ROAD"
  | "LANDSLIDE"
  | "DRAINAGE_OVERFLOW"
  | "STRUCTURAL_DAMAGE"
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
  reporter_id?: string;
  audio_base64?: string;
  audio_mime?: string;
}

export type VehiclePassability =
  | "WALKABLE"
  | "CAUTION_SUV_ONLY"
  | "IMPASSABLE"
  | "EXTREME_BOAT_ONLY"
  | "NOT_APPLICABLE";

export type DepthConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ReportChecks {
  image_verified: boolean;
  weather_supported: boolean;
  cluster_count: number;
  location_matched: boolean;
  risk_level: Urgency;
  estimated_water_depth_cm?: number | null;
  depth_confidence?: DepthConfidence | null;
  depth_reference_anchor?: string | null;
  passability?: VehiclePassability | null;
}

export type CheckSource = "gemini" | "mock" | "fallback" | "code";

export type TraceStepId = "image" | "weather" | "cluster" | "location" | "risk" | "aggregator" | "summary" | "resolution";

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
  summary?: string | null;
  detected_language?: string | null;
  parent_incident_id?: string | null;
  is_corroboration?: boolean;
  estimated_water_depth_cm?: number | null;
  depth_confidence?: DepthConfidence | null;
  depth_reference_anchor?: string | null;
  passability?: VehiclePassability | null;
  trace?: PipelineTrace;
}

export type OfficerAction =
  | "override"
  | "confirm"
  | "reject"
  | "crowdsource"
  | "dispatch"
  | "detour"
  | "assign"
  | "resolve"
  | "alert";

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
  is_road_blocked?: boolean;
  assigned_crew_id?: string;
  assigned_crew_name?: string;
}

export interface ResolveRequest {
  incident_id: string;
  closure_photo_base64: string;
}

export interface ResolveResponse {
  incident_id: string;
  status: HazardStatus;
  is_road_blocked: boolean;
  resolved_at: string;
  resolution_verified?: boolean;
  resolution_notes?: string;
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

export interface CorroboratingReport {
  id: string;
  created_at: string;
  photo_url?: string | null;
  description?: string | null;
  reporter_id?: string | null;
  distance_m?: number;
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
  audio_url?: string | null;
  officer_note?: string;
  officer_log?: OfficerLogEntry[];
  dispatched_at?: string | null;
  assigned_crew_id?: string | null;
  assigned_crew_name?: string | null;
  parent_incident_id?: string | null;
  corroborations_count?: number;
  corroborating_reports?: CorroboratingReport[];
  trace?: PipelineTrace | null;
  summary?: string | null;
  detected_language?: string | null;
  resolution_verified?: boolean;
  resolution_notes?: string | null;
  estimated_water_depth_cm?: number | null;
  depth_confidence?: DepthConfidence | null;
  depth_reference_anchor?: string | null;
  passability?: VehiclePassability | null;
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

export type ShelterNeedCategory = "WATER" | "FOOD" | "MEDICAL" | "BEDDING" | "BABY_CARE" | "SANITATION" | "OTHER";
export type ShelterNeedStatus = "OPEN" | "PARTIALLY_PLEDGED" | "FULFILLED";

export interface ShelterPledge {
  id: string;
  donor_name: string;
  contact_phone: string;
  quantity: string;
  notes?: string;
  created_at: string;
}

export interface ShelterNeed {
  id: string;
  shelter_id: string;
  shelter_name: string;
  ward_id: WardId;
  item_name: string;
  category: ShelterNeedCategory;
  quantity_needed: string;
  quantity_pledged: string;
  urgency: Urgency;
  status: ShelterNeedStatus;
  coordinator_name: string;
  coordinator_phone: string;
  pledges: ShelterPledge[];
  created_at: string;
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

export interface BannedReporter {
  id: string;
  device_label: string;
  ip_address?: string;
  reason: string;
  banned_at: string;
  flagged_reports_count: number;
}

export interface RetuneLogEntry {
  id: string;
  timestamp: string;
  trigger: "OFFICER_OVERRIDE" | "ADMIN_MANUAL";
  incident_id?: string;
  previous_confirm: number;
  new_confirm: number;
  previous_reject: number;
  new_reject: number;
  note: string;
}

export interface RoadClosureCorridor {
  id: string;
  ward_id: WardId;
  name: string;
  description: string;
  status: "OPEN" | "CLOSED";
  reason?: string;
  closed_at?: string;
  detour_suggestion?: string;
  incident_id?: string;
}

export interface DataMuleBeacon {
  id: string;
  type: "FENDER_SOS_BEACON";
  lat: number;
  lng: number;
  ward_id: WardId;
  category: HazardCategory;
  help_request: boolean;
  description: string;
  estimated_people?: number;
  medical_priority?: Urgency;
  created_at: string;
  collected_by_crew_id?: string;
  collected_at?: string;
  synced_at?: string;
}

export type SafeStatus = "SAFE_HOME" | "IN_SHELTER" | "WITH_RELATIVES" | "MEDICAL_CARE";
export type VulnerabilityFlag = "ELDERLY" | "INFANT" | "MEDICAL_INSULIN" | "OXYGEN_POWER" | "WHEELCHAIR";

export interface SafeCheckIn {
  id: string;
  full_name: string;
  contact_masked: string;
  nic_masked?: string;
  status: SafeStatus;
  shelter_id?: string | null;
  shelter_name?: string | null;
  ward_id?: WardId | null;
  location_detail?: string;
  family_count: number;
  vulnerabilities: VulnerabilityFlag[];
  message?: string;
  created_at: string;
  verified_by_shelter?: boolean;
}
