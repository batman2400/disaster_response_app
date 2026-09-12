import type { HazardRow, WardId } from "@/lib/types";

export type HazardMapProps = {
  hazards: HazardRow[];
  routeWards: WardId[];
};
