import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell mode="admin">{children}</AppShell>;
}
