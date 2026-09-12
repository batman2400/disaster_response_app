import {
  banReporter,
  listBannedReporters,
  listFlaggedReports,
  unbanReporter,
} from "@/lib/admin";
import { json, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

export async function GET() {
  const [banned, flagged] = await Promise.all([
    listBannedReporters(),
    listFlaggedReports(),
  ]);

  return json({
    banned,
    flagged,
  });
}

export async function POST(request: Request) {
  let body: {
    action?: "BAN" | "UNBAN";
    reporter_id?: string;
    device_label?: string;
    reason?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.reporter_id || !body.action) {
    return json({ error: "reporter_id and action ('BAN' | 'UNBAN') are required" }, 400);
  }

  if (body.action === "BAN") {
    const banned = await banReporter(
      body.reporter_id,
      body.device_label || "Citizen Device",
      body.reason || "Flagged for repeated false or hoax submissions.",
    );
    return json({ success: true, banned });
  }

  if (body.action === "UNBAN") {
    const success = await unbanReporter(body.reporter_id);
    return json({ success, reporter_id: body.reporter_id });
  }

  return json({ error: "Invalid action" }, 400);
}
