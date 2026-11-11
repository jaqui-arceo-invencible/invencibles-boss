import { AppShell } from "@/components/layout/app-shell";
import { requireAdminOrEditor } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAdminOrEditor();
  return <AppShell mode="admin" role={access.role} name={access.fullName}>{children}</AppShell>;
}
