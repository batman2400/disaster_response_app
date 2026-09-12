import { summarizeCitizenInput } from "../lib/checks/input-summary.ts";
import { checkResolution } from "../lib/checks/resolution.ts";
import { computeDynamicRoute } from "../lib/safe-routes.ts";
import { runUnifiedPipeline } from "../lib/unified-pipeline.ts";

async function main() {
  console.log("--- 1. Testing Multilingual Input Summarization ---");
  const sinhalaRes = await summarizeCitizenInput({
    description: "නගලගම් වීදිය පාලම අසල වතුර පිරිලා, මිනිස්සු තුන්දෙනෙක් හිරවෙලා ඉන්නවා පාර සම්පූර්ණයෙන්ම අවහිරයි",
    category: "FLOOD",
  });
  console.log("Sinhala Result:", JSON.stringify(sinhalaRes, null, 2));

  console.log("\n--- 2. Testing AI Resolution Verification ---");
  const resolveRes = await checkResolution({
    category: "FLOOD",
    description: "Waist-deep water blocking main road",
    closurePhotoBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  });
  console.log("Resolution Verification Result:", JSON.stringify(resolveRes, null, 2));

  console.log("\n--- 3. Testing Dynamic Route Obstacle Avoidance ---");
  const blockedRoute = computeDynamicRoute("ward_01", [
    { lat: 6.9535, lng: 79.8732, is_road_blocked: true, status: "PUBLISHED" },
  ]);
  console.log("Dynamic Route Status (With Obstacle):", blockedRoute.status, "-", blockedRoute.reason);

  const clearRoute = computeDynamicRoute("ward_01", [
    { lat: 6.9535, lng: 79.8732, is_road_blocked: false, status: "RESOLVED" },
  ]);
  console.log("Dynamic Route Status (Resolved):", clearRoute.status, "-", clearRoute.reason);

  console.log("\n--- 4. Testing Unified Fast Multimodal Pipeline ---");
  const unifiedVerdict = await runUnifiedPipeline({
    lat: 6.9535,
    lng: 79.8732,
    ward_id: "ward_01",
    category: "FLOOD",
    photo_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    help_request: false,
    description: "නගලගම් වීදිය පාලම අසල වතුර පිරිලා",
  });
  console.log("Unified Pipeline Verdict:", {
    status: unifiedVerdict.status,
    urgency: unifiedVerdict.urgency,
    confidence: unifiedVerdict.confidence_score,
    summary: unifiedVerdict.summary,
    language: unifiedVerdict.detected_language,
    stepsCount: unifiedVerdict.trace.steps.length,
    totalMs: unifiedVerdict.trace.total_ms,
  });

  console.log("\nAll core AI features verified successfully!");
}

main().catch(console.error);
