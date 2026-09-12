import { json, options } from "@/lib/cors";
import { buildVerdict, persistReport } from "@/lib/pipeline";
import { runUnifiedPipeline } from "@/lib/unified-pipeline";
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

  const reporterId =
    body.reporter_id ||
    request.headers.get("x-reporter-id") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (reporterId) {
    const { isReporterBanned } = await import("@/lib/admin");
    if (await isReporterBanned(reporterId)) {
      return json(
        {
          error: "Your device or reporter identifier has been suspended by municipal administrators due to repeated false/unverified hazard reports.",
          banned: true,
          reporter_id: reporterId,
        },
        403,
      );
    }
  }

  const url = new URL(request.url);
  const useFast = url.searchParams.get("mode") === "fast" || process.env.FAST_AI === "1";

  const verdict = useFast ? await runUnifiedPipeline(body) : await buildVerdict(body);
  const incident_id = crypto.randomUUID();
  const response = { incident_id, ...verdict };
  await persistReport(body, response);
  return json(response);
}
