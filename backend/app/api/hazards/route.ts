import { CORS_HEADERS, options } from "@/lib/cors";
import { listHazards } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return options();
}

export async function GET() {
  const hazards = await listHazards();
  return new Response(JSON.stringify(hazards), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
