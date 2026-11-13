import { LayoutDashboard, UserRound } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { SettingsLink, SettingsSection } from "@/components/design/settings-section";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

export default async function MemberSettingsPage() {
  const access = await requireMember();
  return <main className="admin-page">
    <PageHeader title="Configuración" backHref="/app" />
    <SettingsSection title="Mi cuenta"><SettingsLink href="/app/profile" label="Mi perfil" detail="Nombre, fotografía y privacidad" icon={<UserRound size={22} aria-hidden="true" />} /></SettingsSection>
    {access.role === "admin" ? <SettingsSection title="Administración"><SettingsLink href="/admin" label="Entrar a Administración" detail="Contenido, integrantes e invitaciones" icon={<LayoutDashboard size={22} aria-hidden="true" />} /></SettingsSection> : null}
  </main>;
}
