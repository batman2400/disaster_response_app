import type {
  OverrideRequest,
  ReportRequest,
  ReportResponse,
  ResolveRequest,
} from "./types";

/** Citizen Report screen — POST /api/report */
export const EXAMPLE_REPORT_REQUEST: ReportRequest = {
  lat: 6.9535,
  lng: 79.8732,
  ward_id: "ward_01",
  category: "FLOOD",
  photo_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  help_request: false,
  description: "Waist-deep water rising rapidly near bridge",
};

/** Locked shape the Report verdict screen must render */
export const EXAMPLE_REPORT_RESPONSE: ReportResponse = {
  incident_id: "8f9a2b71-1234-4567-8901-abcdef123456",
  status: "PUBLISHED",
  urgency: "CRITICAL",
  confidence_score: 0.89,
  is_road_blocked: true,
  checks: {
    image_verified: true,
    weather_supported: true,
    cluster_count: 3,
    location_matched: true,
    risk_level: "CRITICAL",
  },
  reasoning:
    "Severe flooding verified by computer vision, reinforced by 68mm/hr rainfall telemetry and 3 local cluster reports.",
};

/** Officer override button — POST /api/override */
export const EXAMPLE_OVERRIDE_REQUEST: OverrideRequest = {
  incident_id: "8f9a2b71-1234-4567-8901-abcdef123456",
  new_status: "PUBLISHED",
  officer_note: "confirmed via CCTV",
};

/** Field crew close button — POST /api/resolve */
export const EXAMPLE_RESOLVE_REQUEST: ResolveRequest = {
  incident_id: "8f9a2b71-1234-4567-8901-abcdef123456",
  closure_photo_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
};
