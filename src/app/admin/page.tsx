import { WorkspaceHome } from "@/components/features/workspace-home";
import { requireAdminOrEditor } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminHome() {
  const access = await requireAdminOrEditor();
  return <WorkspaceHome mode="admin" role={access.role} name={access.fullName} />;
}
