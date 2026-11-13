"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationIsUsable, parseInvitationAccount } from "@/lib/auth/invitation";

export type InvitationAccountState = { error: string };

export async function activateInvitation(_previous: InvitationAccountState, form: FormData): Promise<InvitationAccountState> {
  const account = parseInvitationAccount(form);
  if ("error" in account) return { error: account.error };
  const db = await createClient();
  const { data: { user: current } } = await db.auth.getUser();
  if (current && current.email?.toLowerCase() !== account.email) return { error: "Cierra la sesión actual antes de activar otra cuenta." };

  // Keep retries possible if a later step failed after the single-use OTP was consumed.
  let user = current;
  if (!user?.email_confirmed_at) {
    const { data, error } = await db.auth.verifyOtp({ email: account.email, token: account.code, type: "invite" });
    if (error || !data.user) return { error: "El código no es válido o venció. Revisa el último correo de invitación." };
    user = data.user;
  }
  if (!user || user.email?.toLowerCase() !== account.email || !user.email_confirmed_at) return { error: "No pudimos verificar tu correo." };
  const invitationId: unknown = user.user_metadata.invitation_id;
  if (typeof invitationId !== "string") return { error: "No hay una invitación disponible para esta cuenta." };
  const service = createAdminClient();
  const { data: invitation } = await service.from("invitations").select("id,email,status,expires_at,team_id")
    .eq("id", invitationId).maybeSingle();
  if (!invitation || !invitationIsUsable(invitation, account.email)) return { error: "La invitación venció o ya fue utilizada. Solicita una nueva a administración." };
  const { data: membership, error: membershipError } = await service.from("memberships").select("id")
    .eq("user_id", user.id).eq("team_id", invitation.team_id).in("status", ["active", "suspended"]).maybeSingle();
  if (membershipError || membership) return { error: "Esta cuenta ya tiene acceso asignado. Entra desde Iniciar sesión." };

  const { error: passwordError } = await db.auth.updateUser({ password: account.password, data: { full_name: account.fullName } });
  if (passwordError) return { error: "No pudimos guardar la contraseña. Revisa que cumpla los requisitos e inténtalo de nuevo." };
  const { error: profileError } = await db.from("profiles").update({ full_name: account.fullName }).eq("id", user.id);
  if (profileError) return { error: "No pudimos guardar tu nombre. Inténtalo de nuevo." };
  const { error: acceptError } = await db.rpc("accept_invitation", { invitation_id: invitation.id });
  if (acceptError) return { error: "No pudimos activar la invitación. Inténtalo de nuevo o solicita una nueva a administración." };
  redirect("/app");
}
