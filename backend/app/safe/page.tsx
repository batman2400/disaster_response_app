import type { Metadata } from "next";
import { SafeRegistryClient } from "./SafeRegistryClient";

export const metadata: Metadata = {
  title: "Family Reunification & Evacuee Safety Registry — Fender",
  description:
    "Official Colombo Disaster Management Centre directory to search for evacuated loved ones or confirm your family is safe.",
};

export default function SafePage() {
  return <SafeRegistryClient />;
}
