import { CATEGORIES, WARDS, type HazardCategory, type WardId } from "./types";

export function wardName(id: WardId) {
  return WARDS.find((ward) => ward.id === id)?.name ?? id;
}

export function categoryLabel(id: HazardCategory) {
  return CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export function shortId(id: string) {
  return id.slice(0, 8);
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
