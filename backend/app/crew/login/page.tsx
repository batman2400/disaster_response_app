import { StaffLogin } from "@/components/staff-login";
import { redirectIfSignedIn } from "@/lib/require-role";

export default async function CrewLoginPage() {
  await redirectIfSignedIn();
  return <StaffLogin role="crew" />;
}
