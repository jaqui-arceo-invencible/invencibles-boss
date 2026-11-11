import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverview } from "@/components/features/dashboard-overview";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

export default async function Home() {
  const access = await requireMember();
  return <AppShell mode="member" role={access.role} name={access.fullName}><DashboardOverview /></AppShell>;
}
