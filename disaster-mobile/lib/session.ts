import { API_URL } from "./api";
import type { Role } from "./types";

export type AppSession = {
  role: Role;
  name: string;
};

const STORAGE_KEY = "fender.session";
const FALLBACK_CREW_PASSWORD = process.env.EXPO_PUBLIC_CREW_PASSWORD || "crew";

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readSession(): AppSession | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppSession;
    if (parsed.role !== "CITIZEN" && parsed.role !== "FIELD_CREW") return null;
    if (typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AppSession) {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  storage()?.removeItem(STORAGE_KEY);
}

export function displayName(name: string, role: Role) {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  return role === "FIELD_CREW" ? "Field crew" : "Citizen";
}

export async function verifyCrewPassword(password: string) {
  if (API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/app/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "FIELD_CREW", password }),
      });
      if (response.ok) return;
      if (response.status === 401) {
        throw new Error("Invalid crew password");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid crew password") {
        throw err;
      }
    }
  }

  if (password !== FALLBACK_CREW_PASSWORD) {
    throw new Error("Invalid crew password");
  }
}
