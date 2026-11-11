import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { AuthSubmitButton } from "@/components/features/auth/auth-submit-button";

export const instant = false;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return <main className="auth-page"><section className="auth-card">
    <span className="eyebrow">RECUPERAR ACCESO</span><h1>Restablece tu contraseña</h1>
    {sent ? <p role="status">Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.</p> : <>
      <p>Te enviaremos un enlace seguro si la dirección está registrada.</p>
      <form action={requestPasswordReset} className="auth-form"><label htmlFor="email">Correo electrónico</label><Input id="email" name="email" type="email" autoComplete="email" required /><AuthSubmitButton>Enviar instrucciones</AuthSubmitButton></form>
    </>}
    <Link href="/login" className="auth-link">Volver a iniciar sesión</Link>
  </section></main>;
}
