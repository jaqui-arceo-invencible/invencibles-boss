import Link from "next/link";
import { redirect } from "next/navigation";
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
  return <main className="auth-page login-page"><section className="auth-card">
    <div className="login-identity">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="login-portrait" src="/brand/jacqui-portrait.webp" alt="" width={168} height={168} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="login-logo" src="/brand/jacqui-logo.webp" alt="Jacqui Arceo" width={78} height={78} />
    </div>
    <h1>Jacqui Arceo</h1>
    <p>Qué gusto tenerte de vuelta. Entra a tu espacio privado.</p>
    <p className="eyebrow">Invencibles Boss</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <form action={signIn} className="auth-form">
      <label htmlFor="email">Correo electrónico</label><Input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Contraseña</label><PasswordInput autoComplete="current-password" />
      <AuthSubmitButton>Iniciar sesión</AuthSubmitButton>
    </form>
    <Link href="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
    <Link href="/invite/accept" className="auth-link">Tengo un código de invitación</Link>
    <p className="auth-footnote">El acceso se habilita únicamente mediante invitación.</p>
  </section></main>;
}
