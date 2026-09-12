import { listWards } from "@/lib/db";
import { getReplayState } from "@/lib/replay";

import { WeatherReplay } from "./WeatherReplay";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weather Replay · Fender",
};

export default async function WeatherReplayPage() {
  const [wards, replay] = await Promise.all([listWards(), getReplayState()]);
  return <WeatherReplay wards={wards} initialReplay={replay} />;
}
