import type { ShelterRow, WardId } from "./types";

/**
 * Static safe evacuation routes leading out of hazard hotspots
 * toward the nearest designated emergency shelter.
 */
export const SAFE_ROUTES: Record<WardId, [number, number][]> = {
  ward_01: [
    [6.9535, 79.8732], // Nagalagam St hazard hotspot
    [6.9605, 79.879],
    [6.9698, 79.8917], // toward Peliyagoda Community Centre
  ],
  ward_02: [
    [6.9271, 79.8612], // Bauddhaloka Mawatha hazard hotspot
    [6.921, 79.8624],
    [6.9147, 79.8636], // toward Town Hall Relief Bay
  ],
  ward_03: [
    [6.9355, 79.85], // Pettah hazard hotspot
    [6.935, 79.846],
    [6.9344, 79.8428], // toward Fort Railway Waiting Hall
  ],
};

/**
 * Approximate geographical coordinates for Colombo municipal shelters
 */
export const SHELTER_LOCATIONS: Record<string, [number, number]> = {
  "Kelaniya Temple Hall": [6.958, 79.882],
  "Peliyagoda Community Centre": [6.9698, 79.8917],
  "Town Hall Relief Bay": [6.9147, 79.8636],
  "Thimbirigasyaya School": [6.892, 79.868],
  "Fort Railway Waiting Hall": [6.9344, 79.8428],
};

export interface ShelterWithCoords extends ShelterRow {
  lat: number;
  lng: number;
  available_beds: number;
}

export function attachShelterCoords(shelters: ShelterRow[]): ShelterWithCoords[] {
  return shelters.map((s) => {
    const coords = SHELTER_LOCATIONS[s.name] ?? [6.9271, 79.8612];
    return {
      ...s,
      lat: coords[0],
      lng: coords[1],
      available_beds: Math.max(0, s.total_beds - s.occupied_beds),
    };
  });
}
