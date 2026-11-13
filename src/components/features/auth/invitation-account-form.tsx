"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { activateInvitation } from "@/app/invite/accept/actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/features/auth/password-input";
import { AuthSubmitButton } from "@/components/features/auth/auth-submit-button";

export function InvitationAccountForm() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [state, action, pending] = useActionState(activateInvitation, { error: "" });
  return <form action={action} className="auth-form" onSubmit={(event) => {
    if (step === 0) { event.preventDefault(); setStep(1); }
  }}>
    <div hidden={step !== 0} className="invitation-form-step">
      <label htmlFor="full_name">Nombre completo</label><Input id="full_name" name="full_name" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="email">Correo de la invitación</label><Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="password">Crea tu contraseña</label><PasswordInput autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
      <p className="auth-hint">Al menos 12 caracteres.</p>
    </div>
    {step === 1 ? <div className="invitation-form-step"><KeyRound size={24} aria-hidden="true" /><p>Escribe el código que enviamos a <strong>{email}</strong>. Es válido durante 24 horas desde su envío.</p><label htmlFor="code">Código de invitación</label><Input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" minLength={6} maxLength={12} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} /><p className="auth-hint">Usa el código del último correo recibido.</p></div> : null}
    {state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}
    <AuthSubmitButton>{step === 0 ? "Continuar" : "Verificar y crear cuenta"}</AuthSubmitButton>
    {step === 1 ? <button type="button" className="auth-link" disabled={pending} onClick={() => setStep(0)}><ArrowLeft size={16} aria-hidden="true" />Cambiar mis datos</button> : null}
  </form>;
}
