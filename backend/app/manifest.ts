import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fender · Colombo Flood Response",
    short_name: "Fender",
    description: "Colombo Municipal Council Rapid Flood Response, Evacuation & Relief Coordination",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    orientation: "portrait",
    categories: ["emergency", "utilities", "government"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Report Hazard",
        short_name: "Report",
        description: "Submit urgent flood or electrical hazard report",
        url: "/report",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Live Evacuation Map",
        short_name: "Safe Map",
        description: "View flood hazards and open shelters",
        url: "/map",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Field Crew Queue",
        short_name: "Crew Queue",
        description: "Access municipal field crew work orders",
        url: "/crew",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Family Safety Registry",
        short_name: "I'm Safe",
        description: "Check in family safety status or search evacuees",
        url: "/safe",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
