import Link from "next/link";
import { InvitationAccountForm } from "@/components/features/auth/invitation-account-form";

export const instant = false;

export default function AcceptInvitationPage() {
  return <main className="auth-page login-page"><section className="auth-card">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="invitation-logo" src="/brand/jacqui-logo.webp" alt="Jacqui Arceo" width={80} height={80} />
    <span className="eyebrow">INVENCIBLES BOSS</span><h1>Crea tu cuenta</h1>
    <p>Prepara tus datos y confirma la invitación con el código de tu correo.</p>
    <InvitationAccountForm />
    <Link href="/login" className="auth-link">Ya tengo una cuenta · Iniciar sesión</Link>
  </section></main>;
}
