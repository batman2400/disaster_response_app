import type { WardId, WardStatus } from "./types";

export const DEFAULT_REPLAY_WARD: WardId = "ward_03";
export const DEFAULT_REPLAY_INTERVAL_MS = 2000;
export const REPLAY_CLOCK_START = "14:00";
export const REPLAY_CLOCK_END = "18:00";

export const WARD_SEED: Record<
  WardId,
  { name: string; rainfall_mm: number; river_level_pct: number; status: WardStatus }
> = {
  ward_01: {
    name: "Nagalagam Street (Kelani River Basin)",
    rainfall_mm: 68.0,
    river_level_pct: 88.0,
    status: "CRITICAL",
  },
  ward_02: {
    name: "Thimbirigasyaya / Town Hall",
    rainfall_mm: 42.0,
    river_level_pct: 62.0,
    status: "WATCH",
  },
  ward_03: {
    name: "Pettah / Colombo Fort",
    rainfall_mm: 8.0,
    river_level_pct: 15.0,
    status: "NORMAL",
  },
};

export const REPLAY_TIMELINE = [
  {
    clock: "14:00",
    rainfall_mm: 8,
    river_level_pct: 15,
    message: "Telemetry feed initialized. Listening for data...",
    type: "system" as const,
  },
  {
    clock: "14:40",
    rainfall_mm: 18,
    river_level_pct: 24,
    message: "Precipitation increasing. Catchment still within normal bounds.",
    type: "system" as const,
  },
  {
    clock: "15:20",
    rainfall_mm: 31,
    river_level_pct: 38,
    message: "Status changed to WATCH. Rain crossed 30 mm.",
    type: "warn" as const,
  },
  {
    clock: "16:00",
    rainfall_mm: 45,
    river_level_pct: 55,
    message: "Rain crossed 40 mm — weather check will now trip on new reports.",
    type: "warn" as const,
  },
  {
    clock: "16:40",
    rainfall_mm: 58,
    river_level_pct: 68,
    message: "Approaching critical thresholds.",
    type: "warn" as const,
  },
  {
    clock: "17:20",
    rainfall_mm: 71,
    river_level_pct: 82,
    message: "THRESHOLD BREACH: Rain ≥ 60 mm, river ≥ 80%. Status CRITICAL.",
    type: "critical" as const,
  },
  {
    clock: "18:00",
    rainfall_mm: 79,
    river_level_pct: 91,
    message: "Storm peak. Area warning is live on the public map.",
    type: "alert" as const,
  },
] as const;

export function statusFor(rainfall_mm: number, river_level_pct: number): WardStatus {
  if (rainfall_mm >= 60 || river_level_pct >= 80) return "CRITICAL";
  if (rainfall_mm >= 30 || river_level_pct >= 50) return "WATCH";
  return "NORMAL";
}

export function isWardId(value: unknown): value is WardId {
  return value === "ward_01" || value === "ward_02" || value === "ward_03";
}
