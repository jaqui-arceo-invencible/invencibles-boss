import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceHome } from "@/components/features/workspace-home";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

export default async function Home() {
  const access = await requireMember();
  return <AppShell mode="member" role={access.role} name={access.fullName}><WorkspaceHome mode="member" role={access.role} name={access.fullName} /></AppShell>;
}
