import { StaffLogin } from "@/components/staff-login";
import { redirectIfSignedIn } from "@/lib/require-role";

export default async function CrewLoginPage() {
  await redirectIfSignedIn("crew");
  return <StaffLogin role="crew" />;
}
