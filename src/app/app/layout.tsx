import { AppShell } from "@/components/layout/app-shell";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireMember();
  return <AppShell mode="member" role={access.role} name={access.fullName}>{children}</AppShell>;
}
