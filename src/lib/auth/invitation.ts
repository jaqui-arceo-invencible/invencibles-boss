export const INVITATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function invitationExpiresAt(now = Date.now()) {
  return new Date(now + INVITATION_LIFETIME_MS).toISOString();
}

export function invitationIsUsable(invitation: { email: string; status: string; expires_at: string }, email: string, now = Date.now()) {
  const expires = Date.parse(invitation.expires_at);
  return invitation.status === "pending" && invitation.email.toLowerCase() === email.toLowerCase()
    && Number.isFinite(expires) && expires > now;
}

export function parseInvitationAccount(form: FormData): { error: string } | { email: string; fullName: string; password: string; code: string } {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const password = String(form.get("password") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Revisa tu correo electrónico." } as const;
  if (fullName.length < 2 || fullName.length > 100) return { error: "Escribe tu nombre completo." } as const;
  if (password.length < 12 || password.length > 128) return { error: "Usa una contraseña de 12 a 128 caracteres." } as const;
  // Auth validates the actual OTP length and value against its configured policy.
  if (!/^\d{6,10}$/.test(code)) return { error: "Escribe el código numérico que recibiste por correo." } as const;
  return { email, fullName, password, code } as const;
}
