import type {
  AiSettings,
  HazardRow,
  ShelterRow,
  WardRow,
} from "./types";

export const wards: WardRow[] = [
  {
    id: "ward_01",
    name: "Nagalagam Street (Kelani River Basin)",
    rainfall_mm: 68.0,
    river_level_pct: 88.0,
    status: "CRITICAL",
  },
  {
    id: "ward_02",
    name: "Thimbirigasyaya / Town Hall",
    rainfall_mm: 42.0,
    river_level_pct: 62.0,
    status: "WATCH",
  },
  {
    id: "ward_03",
    name: "Pettah / Colombo Fort",
    rainfall_mm: 8.0,
    river_level_pct: 15.0,
    status: "NORMAL",
  },
];

export const shelters: ShelterRow[] = [
  {
    id: "s-kelaniya",
    ward_id: "ward_01",
    name: "Kelaniya Temple Hall",
    total_beds: 120,
    occupied_beds: 96,
    supplies_status: "LOW",
  },
  {
    id: "s-peliyagoda",
    ward_id: "ward_01",
    name: "Peliyagoda Community Centre",
    total_beds: 80,
    occupied_beds: 22,
    supplies_status: "ADEQUATE",
  },
  {
    id: "s-townhall",
    ward_id: "ward_02",
    name: "Town Hall Relief Bay",
    total_beds: 150,
    occupied_beds: 61,
    supplies_status: "ADEQUATE",
  },
  {
    id: "s-thimbi",
    ward_id: "ward_02",
    name: "Thimbirigasyaya School",
    total_beds: 90,
    occupied_beds: 88,
    supplies_status: "CRITICAL",
  },
  {
    id: "s-fort",
    ward_id: "ward_03",
    name: "Fort Railway Waiting Hall",
    total_beds: 60,
    occupied_beds: 12,
    supplies_status: "ADEQUATE",
  },
];

export const hazards = new Map<string, HazardRow>([
  [
    "11111111-1111-1111-1111-111111111111",
    {
      id: "11111111-1111-1111-1111-111111111111",
      lat: 6.9535,
      lng: 79.8732,
      ward_id: "ward_01",
      category: "FLOOD",
      description: "Waist-deep water near Nagalagam bridge",
      photo_url: null,
      status: "AREA_ALERT",
      urgency: "CRITICAL",
      confidence_score: 0.91,
      is_road_blocked: true,
      confirmations_count: 4,
      created_at: new Date().toISOString(),
      resolved_at: null,
      closure_photo_url: null,
    },
  ],
  [
    "22222222-2222-2222-2222-222222222222",
    {
      id: "22222222-2222-2222-2222-222222222222",
      lat: 6.9548,
      lng: 79.8734,
      ward_id: "ward_01",
      category: "FLOOD",
      description: "Road impassable, cars stalled",
      photo_url: null,
      status: "PUBLISHED",
      urgency: "CRITICAL",
      confidence_score: 0.84,
      is_road_blocked: true,
      confirmations_count: 2,
      created_at: new Date().toISOString(),
      resolved_at: null,
      closure_photo_url: null,
    },
  ],
  [
    "33333333-3333-3333-3333-333333333333",
    {
      id: "33333333-3333-3333-3333-333333333333",
      lat: 6.9271,
      lng: 79.8612,
      ward_id: "ward_02",
      category: "FALLEN_TREE",
      description: "Large tree across Bauddhaloka Mawatha",
      photo_url: null,
      status: "COUNCIL_TICKET",
      urgency: "MEDIUM",
      confidence_score: 0.72,
      is_road_blocked: true,
      confirmations_count: 1,
      created_at: new Date().toISOString(),
      resolved_at: null,
      closure_photo_url: null,
    },
  ],
  [
    "44444444-4444-4444-4444-444444444444",
    {
      id: "44444444-4444-4444-4444-444444444444",
      lat: 6.9355,
      lng: 79.85,
      ward_id: "ward_03",
      category: "HELP_REQUEST",
      description: "Family of 5 needs dry shelter tonight",
      photo_url: null,
      status: "NEED_INFO",
      urgency: "MEDIUM",
      confidence_score: 0.41,
      is_road_blocked: false,
      confirmations_count: 0,
      created_at: new Date().toISOString(),
      resolved_at: null,
      closure_photo_url: null,
    },
  ],
]);

export const aiSettings: AiSettings = {
  confirm_threshold: 0.65,
  reject_threshold: 0.3,
};

export function listHazards() {
  return Array.from(hazards.values());
}

export function getHazard(id: string) {
  return hazards.get(id) ?? null;
}

export function upsertHazard(row: HazardRow) {
  hazards.set(row.id, row);
  return row;
}

export function getShelter(id: string) {
  return shelters.find((shelter) => shelter.id === id) ?? null;
}

export function upsertShelter(row: ShelterRow) {
  const index = shelters.findIndex((shelter) => shelter.id === row.id);
  if (index >= 0) {
    shelters[index] = row;
  } else {
    shelters.push(row);
  }
  return row;
}
