import { listRoadCorridors, toggleCorridorClosure } from "@/lib/admin";
import { json, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

export async function GET() {
  const corridors = await listRoadCorridors();
  return json({ corridors });
}

export async function POST(request: Request) {
  let body: {
    corridor_id?: string;
    action?: "CLOSE" | "OPEN";
    reason?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.corridor_id || !body.action) {
    return json({ error: "corridor_id and action ('CLOSE' | 'OPEN') are required" }, 400);
  }

  try {
    const updated = await toggleCorridorClosure(
      body.corridor_id,
      body.action === "CLOSE",
      body.reason || (body.action === "CLOSE" ? "Precautionary municipal road closure" : undefined),
    );
    return json({ success: true, corridor: updated });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed to toggle corridor" }, 400);
  }
}
