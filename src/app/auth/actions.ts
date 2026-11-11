"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Completa%20tu%20correo%20y%20contraseña");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=No%20pudimos%20iniciar%20sesión.%20Revisa%20tus%20datos%20o%20activa%20tu%20invitación");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const supabase = await createClient();
  if (email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
    });
  }
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 12) redirect("/reset-password?error=Usa%20al%20menos%2012%20caracteres");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=El%20enlace%20ya%20no%20es%20válido");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=No%20pudimos%20actualizar%20la%20contraseña");
  redirect("/onboarding");
}

export async function completeOnboarding(formData: FormData) {
  const fullName = value(formData, "full_name").replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 100) redirect("/onboarding?error=Escribe%20tu%20nombre%20completo");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (profileError) redirect("/onboarding?error=No%20pudimos%20guardar%20tu%20perfil");

  const invitationId = user.user_metadata.invitation_id;
  if (typeof invitationId === "string") {
    const { error } = await supabase.rpc("accept_invitation", { invitation_id: invitationId });
    if (error) redirect("/invite/accept?error=El%20enlace%20no%20es%20válido%20o%20ya%20venció");
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
