import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/features/auth/password-input";
import { AuthSubmitButton } from "@/components/features/auth/auth-submit-button";

export const instant = false;

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await searchParams;
  if (!user) return <main className="auth-page"><section className="auth-card"><span className="eyebrow">INVITACIÓN PRIVADA</span><h1>Revisa tu enlace</h1><p>{error ?? "Abre el enlace de invitación desde el correo que recibiste. El enlace es personal y de uso único."}</p><Link href="/login" className="auth-link">Ir al inicio de sesión</Link></section></main>;
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">INVITACIÓN PRIVADA</span><h1>Activa tu acceso</h1><p>Elige una contraseña para terminar de activar tu cuenta.</p>{error && <p role="alert" className="auth-error">{error}</p>}<form action={updatePassword} className="auth-form"><label htmlFor="password">Contraseña</label><PasswordInput autoComplete="new-password" minLength={12} /><p className="auth-hint">Usa al menos 12 caracteres.</p><AuthSubmitButton>Continuar</AuthSubmitButton></form></section></main>;
}
