import {
  listBannedReporters,
  listFlaggedReports,
  listRetuneLogs,
  listRoadCorridors,
} from "@/lib/admin";
import { getAiSettings } from "@/lib/db";

import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [corridors, banned, flagged, aiSettings, retuneLogs] = await Promise.all([
    listRoadCorridors(),
    listBannedReporters(),
    listFlaggedReports(),
    getAiSettings(),
    listRetuneLogs(),
  ]);

  return (
    <AdminConsole
      initialCorridors={corridors}
      initialBanned={banned}
      initialFlagged={flagged}
      initialAiSettings={aiSettings}
      initialRetuneLogs={retuneLogs}
    />
  );
}
