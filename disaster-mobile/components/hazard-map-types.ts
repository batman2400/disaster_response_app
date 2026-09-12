import type { HazardRow, WardId } from "@/lib/types";

export type HazardMapProps = {
  hazards: HazardRow[];
  routeWards: WardId[];
  selectedHazardId?: string | null;
  onSelectHazard?: (hazard: HazardRow | null) => void;
  focusCoords?: { latitude: number; longitude: number; zoom?: number } | null;
};
