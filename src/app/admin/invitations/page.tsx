import { createInvitation } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton } from "@/components/design/buttons";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RevokeInvitationButton } from "@/components/features/admin/revoke-invitation-button";
import { ResendInvitationButton } from "@/components/features/admin/resend-invitation-button";

export const instant = false;

const labels: Record<string, string> = { pending: "Pendiente", accepted: "Aceptada", expired: "Vencida", revoked: "Revocada" };
function isExpired(expiresAt: string) { return Date.parse(expiresAt) <= Date.now(); }
export default async function AdminInvitationsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; revoked?: string; resent?: string }> }) {
  const admin = await requireAdmin();
  const service = createAdminClient();
  const { data: invitations } = await service.from("invitations").select("id,email,role,status,expires_at,created_at,accepted_at").eq("team_id", admin.teamId).order("created_at", { ascending: false });
  const { error, created, revoked, resent } = await searchParams;
  return <div className="admin-page"><PageHeader title="Invitaciones" backHref="/admin" /><p>Invita a nuevas integrantes a su espacio de aprendizaje.</p>
    {error && <p className="inline-alert" role="alert">{error}</p>}{created && <p className="inline-success" role="status">Código enviado. La invitada puede crear su cuenta desde Iniciar sesión → Tengo un código de invitación. Vence en 24 horas.</p>}{revoked && <p className="inline-success" role="status">La invitación quedó revocada.</p>}{resent && <p className="inline-success" role="status">Enviamos un nuevo código válido durante 24 horas. El anterior deja de funcionar.</p>}
    <Card><CardContent className="admin-card-content"><h2>Invitar integrante</h2><form action={createInvitation} className="invite-form"><div><label htmlFor="full_name">Nombre <span>(opcional)</span></label><Input id="full_name" name="full_name" maxLength={100} autoComplete="name" /></div><div><label htmlFor="email">Correo electrónico</label><Input id="email" name="email" type="email" required autoComplete="email" /></div><div><label htmlFor="role">Rol inicial</label><select id="role" name="role" defaultValue="member"><option value="member">Socia</option><option value="editor">Editora</option></select></div><PrimaryButton type="submit">Enviar invitación</PrimaryButton></form></CardContent></Card>
    <Card><CardContent className="admin-card-content"><h2>Historial de invitaciones</h2><div className="responsive-table"><table><thead><tr><th>Correo</th><th>Rol</th><th>Estado</th><th>Enviada</th><th>Vence</th><th></th></tr></thead><tbody>
      {(invitations ?? []).map((invitation) => { const expired = invitation.status === "pending" && isExpired(invitation.expires_at); const status = expired ? "expired" : invitation.status; return <tr key={invitation.id}><td>{invitation.email}</td><td>{invitation.role === "editor" ? "Editora" : "Socia"}</td><td><span className={`status-badge status-${status}`}>{labels[status] ?? status}</span></td><td>{new Date(invitation.created_at).toLocaleDateString("es-MX")}</td><td>{new Date(invitation.expires_at).toLocaleDateString("es-MX")}</td><td className="invitation-actions">{invitation.status === "pending" && !expired && <><ResendInvitationButton id={invitation.id} /><RevokeInvitationButton id={invitation.id} /></>}</td></tr>; })}
      {!(invitations ?? []).length && <tr><td colSpan={6} className="table-empty">Aún no hay invitaciones.</td></tr>}
    </tbody></table></div></CardContent></Card>
  </div>;
}
