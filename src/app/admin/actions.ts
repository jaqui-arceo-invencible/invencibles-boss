"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MembershipStatus, TeamRole } from "@/types/database";

function field(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }

export async function createInvitation(formData: FormData) {
  const admin = await requireAdmin();
  const email = field(formData, "email").toLowerCase();
  const fullName = field(formData, "full_name").replace(/\s+/g, " ").slice(0, 100);
  const role = field(formData, "role") as TeamRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["member", "editor"].includes(role)) redirect("/admin/invitations?error=Revisa%20el%20correo%20y%20el%20rol");

  const service = createAdminClient();
  const { data: team } = await service.from("teams").select("id").eq("slug", "invencibles-boss").single();
  if (!team) redirect("/admin/invitations?error=No%20encontramos%20el%20equipo");
  const { data: userPage } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const invitedUser = userPage.users.find((user) => user.email?.toLowerCase() === email);
  if (invitedUser) {
    const { data: existingMembership } = await service.from("memberships").select("id")
      .eq("team_id", team.id).eq("user_id", invitedUser.id).in("status", ["active", "suspended"]).limit(1);
    if (existingMembership?.length) redirect("/admin/invitations?error=Ese%20correo%20ya%20tiene%20una%20membresía");
  }
  await service.from("invitations").update({ status: "expired" }).eq("team_id", team.id).eq("status", "pending").lte("expires_at", new Date().toISOString());
  const { data: duplicate } = await service.from("invitations").select("id").eq("team_id", team.id).eq("email", email).eq("status", "pending").limit(1);
  if (duplicate?.length) redirect("/admin/invitations?error=Ya%20hay%20una%20invitación%20pendiente%20para%20ese%20correo");

  const { data: invitation, error: insertError } = await service.from("invitations").insert({
    team_id: team.id, email, invited_by: admin.userId, role, status: "pending",
  }).select("id").single();
  if (insertError || !invitation) redirect("/admin/invitations?error=No%20pudimos%20crear%20la%20invitación");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/invite/accept`,
    data: { full_name: fullName, invitation_id: invitation.id },
  });
  if (inviteError) {
    await service.from("invitations").update({ status: "revoked" }).eq("id", invitation.id);
    redirect("/admin/invitations?error=No%20se%20pudo%20enviar.%20Verifica%20la%20configuración%20de%20correo%20o%20si%20esa%20cuenta%20ya%20existe");
  }
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?created=1");
}

export async function resendInvitation(formData: FormData) {
  const admin = await requireAdmin();
  const invitationId = field(formData, "invitation_id");
  const service = createAdminClient();
  const { data: invitation } = await service.from("invitations").select("id,email,expires_at,status,role")
    .eq("id", invitationId).eq("team_id", admin.teamId).single();
  if (!invitation || invitation.status !== "pending") redirect("/admin/invitations?error=Esta%20invitación%20ya%20no%20está%20pendiente");
  if (Date.parse(invitation.expires_at) <= Date.now()) {
    await service.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    redirect("/admin/invitations?error=La%20invitación%20venció.%20Crea%20una%20nueva");
  }
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { error: extendError } = await service.from("invitations").update({ expires_at: expiresAt }).eq("id", invitation.id);
  if (extendError) redirect("/admin/invitations?error=No%20pudimos%20preparar%20el%20reenvío");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await service.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/invite/accept`,
    data: { invitation_id: invitation.id },
  });
  if (error) {
    await service.from("invitations").update({ status: "revoked" }).eq("id", invitation.id);
    redirect("/admin/invitations?error=No%20pudimos%20reenviar.%20Comprueba%20si%20la%20cuenta%20ya%20fue%20activada");
  }
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?resent=1");
}

export async function revokeInvitation(formData: FormData) {
  const admin = await requireAdmin();
  const invitationId = field(formData, "invitation_id");
  const service = createAdminClient();
  const { error } = await service.from("invitations").update({ status: "revoked" })
    .eq("id", invitationId).eq("team_id", admin.teamId).eq("status", "pending");
  if (error) redirect("/admin/invitations?error=No%20pudimos%20revocar%20la%20invitación");
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?revoked=1");
}

export async function updateMembership(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "membership_id");
  const role = field(formData, "role") as TeamRole;
  const status = field(formData, "status") as MembershipStatus;
  if (!["admin", "editor", "member"].includes(role) || !["active", "suspended", "revoked"].includes(status)) redirect("/admin/users?error=Datos%20inválidos");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_membership", { target_membership: id, new_role: role, new_status: status });
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message === "last_active_admin" ? "No se puede retirar el último acceso de administración." : "No pudimos actualizar a esta integrante.")}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
