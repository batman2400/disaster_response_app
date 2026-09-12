import type { HazardCategory, HazardStatus, Urgency, WardId, WardStatus } from "./types";

export const WARDS: { id: WardId; name: string }[] = [
  { id: "ward_01", name: "Nagalagam Street (Kelani River Basin)" },
  { id: "ward_02", name: "Thimbirigasyaya / Town Hall" },
  { id: "ward_03", name: "Pettah / Colombo Fort" },
];

export const CATEGORIES: { id: HazardCategory; label: string }[] = [
  { id: "FLOOD", label: "Flood" },
  { id: "BLOCKED_ROAD", label: "Blocked road" },
  { id: "FALLEN_TREE", label: "Fallen tree" },
  { id: "HELP_REQUEST", label: "Help request" },
];

export function wardName(id: WardId) {
  return WARDS.find((ward) => ward.id === id)?.name ?? id;
}

export function wardShort(id: WardId) {
  return wardName(id).split(" / ")[0]?.split(" (")[0] ?? id;
}

export function categoryLabel(id: HazardCategory) {
  return CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export function scorePct(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const PIN_COLORS: Record<HazardStatus, string> = {
  PENDING: "#9CA3AF",
  PUBLISHED: "#2563EB",
  NEED_INFO: "#F59E0B",
  AREA_ALERT: "#DC2626",
  COUNCIL_TICKET: "#7C3AED",
  RESOLVED: "#16A34A",
};

export const URGENCY_COLORS: Record<Urgency, string> = {
  LOW: "#2F9E6A",
  MEDIUM: "#F5A524",
  CRITICAL: "#E23B3B",
};

export const WARD_STATUS_COLORS: Record<WardStatus, string> = {
  NORMAL: "#2F9E6A",
  WATCH: "#F5A524",
  CRITICAL: "#E23B3B",
};
