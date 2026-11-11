import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverview } from "@/components/features/dashboard-overview";

export default function Home() {
  return <AppShell mode="member"><DashboardOverview /></AppShell>;
}
