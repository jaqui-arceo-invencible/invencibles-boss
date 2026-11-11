import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { signIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/features/auth/password-input";
import { AuthSubmitButton } from "@/components/features/auth/auth-submit-button";

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-mark"><LockKeyhole aria-hidden="true" /></div>
    <span className="eyebrow">INVENCIBLES BOSS</span><h1>Qué gusto tenerte de vuelta</h1>
    <p>Inicia sesión para continuar en tu espacio privado.</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <form action={signIn} className="auth-form">
      <label htmlFor="email">Correo electrónico</label><Input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Contraseña</label><PasswordInput autoComplete="current-password" />
      <AuthSubmitButton>Iniciar sesión</AuthSubmitButton>
    </form>
    <Link href="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
    <p className="auth-footnote">El acceso se habilita únicamente mediante invitación.</p>
  </section></main>;
}
