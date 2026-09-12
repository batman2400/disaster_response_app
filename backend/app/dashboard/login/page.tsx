import { StaffLogin } from "@/components/staff-login";
import type { DashRole } from "@/lib/dashboard-auth";
import { redirectIfSignedIn } from "@/lib/require-role";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role: DashRole = params.role === "relief" ? "relief" : "officer";
  await redirectIfSignedIn(role);
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <StaffLogin role={role} />
    </div>
  );
}
