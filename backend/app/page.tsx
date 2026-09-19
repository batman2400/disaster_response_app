import { PublicShell } from "@/components/public-shell";
import { FrontlineHomeClient } from "@/components/home/frontline-home-client";
import { readDashboardRole } from "@/lib/dashboard-auth";
import { listHazards, listShelters, listWards, loadBroadcastAlert } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [signedIn, hazards, wards, shelters, broadcastAlert] = await Promise.all([
    readDashboardRole(),
    listHazards(),
    listWards(),
    listShelters(),
    loadBroadcastAlert(),
  ]);

  return (
    <PublicShell variant="wide">
      <div className="flex-1 px-3 py-3 sm:px-6 lg:px-8 lg:py-6 pl-safe pr-safe">
        <FrontlineHomeClient
          hazards={hazards}
          wards={wards}
          shelters={shelters}
          broadcastAlert={broadcastAlert}
          signedInRole={signedIn}
        />
      </div>
    </PublicShell>
  );
}
