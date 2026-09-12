import { json, options } from "@/lib/cors";
import { buildVerdict, persistReport } from "@/lib/pipeline";
import type { ReportRequest } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: ReportRequest;
  try {
    body = (await request.json()) as ReportRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    !body.ward_id ||
    !body.category
  ) {
    return json({ error: "lat, lng, ward_id, and category are required" }, 400);
  }

  const verdict = await buildVerdict(body);
  const incident_id = crypto.randomUUID();
  const response = { incident_id, ...verdict };
  await persistReport(body, response);
  return json(response);
}
