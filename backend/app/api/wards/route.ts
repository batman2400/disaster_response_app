import { CORS_HEADERS, options } from "@/lib/cors";
import { listWards } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return options();
}

export async function GET() {
  const wards = await listWards();
  return new Response(JSON.stringify(wards), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
