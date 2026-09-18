import { DEMO_SAMPLE_AUDIO_URL } from "./demo-audio";
import type {
  AiSettings,
  HazardRow,
  ShelterNeed,
  ShelterPledge,
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
      audio_url: DEMO_SAMPLE_AUDIO_URL,
      summary: "Waist-deep flood waters rising rapidly near Nagalagam street bridge with impassable road conditions.",
      detected_language: "Sinhala",
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

export interface CrewTeam {
  id: string;
  name: string;
  shortName: string;
  categorySpecialty: string[];
  contactPhone: string;
  station: string;
  specialty: string;
  eta: string;
}

export const SELECTED_CREW_STORAGE_KEY = "fender_selected_crew_unit";

export const CREW_TEAMS: CrewTeam[] = [
  {
    id: "crew_drainage_01",
    name: "CMC Drainage Unit 01 (Basin North)",
    shortName: "Drainage 01",
    categorySpecialty: ["DRAINAGE_OVERFLOW", "FLOOD"],
    contactPhone: "+94 11 269 1111",
    station: "Kelani Basin Depot, Nagalagam St",
    specialty: "High-capacity submersible pumps & culvert clearing",
    eta: "15 mins",
  },
  {
    id: "crew_watercraft_01",
    name: "Kelani Watercraft & Boat Rescue Unit",
    shortName: "Boat Rescue",
    categorySpecialty: ["HELP_REQUEST", "FLOOD"],
    contactPhone: "+94 11 267 0002",
    station: "Peliyagoda Rapid Water Response Base",
    specialty: "Inflatable rescue dinghies & citizen extraction",
    eta: "20 mins",
  },
  {
    id: "crew_ceb_01",
    name: "CEB Colombo Emergency Line Crew",
    shortName: "CEB Line",
    categorySpecialty: ["ELECTRICAL_HAZARD"],
    contactPhone: "+94 11 242 1198",
    station: "CEB Area Depot, Pettah",
    specialty: "Submerged transformer & live wire hazard isolation",
    eta: "25 mins",
  },
  {
    id: "crew_roads_01",
    name: "CMC Road & Culvert Clearing Unit",
    shortName: "Roads",
    categorySpecialty: ["BLOCKED_ROAD", "FALLEN_TREE", "LANDSLIDE"],
    contactPhone: "+94 11 268 4422",
    station: "Town Hall Mechanical Works Yard",
    specialty: "Heavy hydraulic winches, chainsaws & tree removal",
    eta: "30 mins",
  },
  {
    id: "crew_general_01",
    name: "CMC Rapid Disaster Taskforce",
    shortName: "Taskforce",
    categorySpecialty: ["STRUCTURAL_DAMAGE", "FLOOD", "HELP_REQUEST"],
    contactPhone: "+94 11 269 3333",
    station: "CMC Central Depot, Maligawatta",
    specialty: "Medical first responders & sandbag barrier deployment",
    eta: "20 mins",
  },
];

export function getCrewTeam(id: string): CrewTeam | undefined {
  return CREW_TEAMS.find((crew) => crew.id === id);
}

type CrewAssignmentSource = {
  assigned_crew_id?: string | null;
  assigned_crew_name?: string | null;
  officer_note?: string | null;
  officer_log?: { action?: string; note?: string }[] | null;
};

export function resolveAssignedCrew(hazard: CrewAssignmentSource): { id: string; name: string } | null {
  if (hazard.assigned_crew_id) {
    const team = getCrewTeam(hazard.assigned_crew_id);
    if (team) return { id: team.id, name: hazard.assigned_crew_name || team.name };
  }
  if (hazard.assigned_crew_name) {
    const named = CREW_TEAMS.find(
      (team) => team.name === hazard.assigned_crew_name || team.shortName === hazard.assigned_crew_name,
    );
    if (named) return { id: named.id, name: named.name };
  }

  const texts = [
    ...(hazard.officer_log ?? []).map((entry) => `${entry.action ?? ""} ${entry.note ?? ""}`),
    hazard.officer_note ?? "",
  ];
  for (const text of texts) {
    if (!/dispatched|assigned/i.test(text)) continue;
    const team = CREW_TEAMS.find(
      (unit) => text.includes(unit.name) || text.includes(unit.shortName),
    );
    if (team) return { id: team.id, name: team.name };
  }
  return null;
}

export function isHazardAssignedToCrew(hazard: CrewAssignmentSource, crewId: string): boolean {
  return resolveAssignedCrew(hazard)?.id === crewId;
}

export const shelterNeeds: ShelterNeed[] = [
  {
    id: "need-01",
    shelter_id: "s-peliyagoda",
    shelter_name: "Peliyagoda Community Centre",
    ward_id: "ward_01",
    item_name: "Clean Drinking Water (5L Bottles)",
    category: "WATER",
    quantity_needed: "150 Bottles",
    quantity_pledged: "60 Bottles",
    urgency: "CRITICAL",
    status: "PARTIALLY_PLEDGED",
    coordinator_name: "Mr. D. Wickramasinghe",
    coordinator_phone: "+94 11 293 0511",
    pledges: [
      {
        id: "p-01",
        donor_name: "Rotary Club Colombo West",
        contact_phone: "077 345 6789",
        quantity: "60 Bottles",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "need-02",
    shelter_id: "s-thimbirigasyaya",
    shelter_name: "Thimbirigasyaya School",
    ward_id: "ward_02",
    item_name: "Infant Formula & Diapers (Medium)",
    category: "BABY_CARE",
    quantity_needed: "40 Packs",
    quantity_pledged: "10 Packs",
    urgency: "CRITICAL",
    status: "PARTIALLY_PLEDGED",
    coordinator_name: "Principal M. Jayasuriya",
    coordinator_phone: "+94 11 258 7320",
    pledges: [],
    created_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "need-03",
    shelter_id: "s-kelaniya",
    shelter_name: "Kelaniya Temple Hall",
    ward_id: "ward_01",
    item_name: "Dry Rations (Dhal, Rice, Canned Fish)",
    category: "FOOD",
    quantity_needed: "80 Food Hampers",
    quantity_pledged: "80 Food Hampers",
    urgency: "MEDIUM",
    status: "FULFILLED",
    coordinator_name: "Ven. Sarananda Thero",
    coordinator_phone: "+94 11 291 1422",
    pledges: [
      {
        id: "p-02",
        donor_name: "Sarvodaya Shramadana Relief",
        contact_phone: "071 889 0012",
        quantity: "80 Food Hampers",
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "need-04",
    shelter_id: "s-townhall",
    shelter_name: "Town Hall Relief Bay",
    ward_id: "ward_02",
    item_name: "Sleeping Mats & Waterproof Tarpaulins",
    category: "BEDDING",
    quantity_needed: "50 Mats",
    quantity_pledged: "0",
    urgency: "MEDIUM",
    status: "OPEN",
    coordinator_name: "Officer K. Perera",
    coordinator_phone: "+94 11 268 4211",
    pledges: [],
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export function listShelterNeeds() {
  return [...shelterNeeds];
}

export function createShelterNeed(need: ShelterNeed) {
  shelterNeeds.unshift(need);
  return need;
}

export function pledgeShelterNeed(needId: string, pledge: ShelterPledge) {
  const found = shelterNeeds.find((n) => n.id === needId);
  if (!found) return null;
  found.pledges.push(pledge);
  found.status = "PARTIALLY_PLEDGED";
  return found;
}
