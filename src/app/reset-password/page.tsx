import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/features/auth/password-input";
import { AuthSubmitButton } from "@/components/features/auth/auth-submit-button";

export const instant = false;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">NUEVA CONTRASEÑA</span><h1>Elige una contraseña segura</h1>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {user ? <form action={updatePassword} className="auth-form"><label htmlFor="password">Nueva contraseña</label><PasswordInput autoComplete="new-password" minLength={12} /><p className="auth-hint">Usa al menos 12 caracteres.</p><AuthSubmitButton>Guardar contraseña</AuthSubmitButton></form> : <p>Abre el enlace de recuperación enviado a tu correo para continuar.</p>}
    <Link href="/login" className="auth-link">Volver a iniciar sesión</Link>
  </section></main>;
}
