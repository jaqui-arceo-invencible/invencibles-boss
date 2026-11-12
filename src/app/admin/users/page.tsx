import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/design/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UsersTable, type AdminUserRow } from "@/components/features/admin/users-table";

export const instant = false;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const admin = await requireAdmin();
  const service = createAdminClient();
  const [{ data: memberships }, { data: authUsers }] = await Promise.all([
    service.from("memberships").select("id,user_id,role,status,joined_at").eq("team_id", admin.teamId).order("joined_at", { ascending: false }),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const ids = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles } = ids.length ? await service.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const emailMap = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email ?? ""]));
  const rows: AdminUserRow[] = (memberships ?? []).map((membership) => ({
    id: membership.user_id, membershipId: membership.id, name: profileMap.get(membership.user_id) ?? "",
    email: emailMap.get(membership.user_id) ?? "", role: membership.role, status: membership.status, joinedAt: membership.joined_at,
  }));
  const { error, updated } = await searchParams;
  return <div className="admin-page"><PageHeader title="Integrantes" backHref="/admin" /><p>{rows.length} integrantes. Administra los accesos y permisos.</p>
    {error && <p className="inline-alert" role="alert">{error}</p>}{updated && <p className="inline-success" role="status">Los permisos se actualizaron.</p>}
    <Card><CardContent className="admin-card-content"><UsersTable users={rows} currentUserId={admin.userId} /></CardContent></Card>
  </div>;
}
