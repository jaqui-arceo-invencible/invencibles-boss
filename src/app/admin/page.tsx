import { DashboardOverview } from "@/components/features/dashboard-overview";
import { requireAdminOrEditor } from "@/lib/auth/guards";

export default async function AdminHome() {
  await requireAdminOrEditor();
  return <DashboardOverview admin />;
}
