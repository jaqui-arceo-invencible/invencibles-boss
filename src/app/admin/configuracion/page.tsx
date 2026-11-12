import { PageHeader } from "@/components/design/page-header";
import { SettingsField } from "@/components/design/settings-field";
import { requireAdmin } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminSettingsPage() {
  const access = await requireAdmin();
  return <div className="admin-page">
    <PageHeader title="Configuración" backHref="/admin" />
    <SettingsField label="Nombre" value={access.fullName || "Sin nombre"} hint="Nombre de la cuenta que administra el equipo." />
    <SettingsField label="Correo" value={access.email || "Sin correo"} hint="Se usa para entrar y para las acciones de administración." />
    <SettingsField label="Rol" value="Administradora" hint="La publicación de lecciones queda reservada a este rol." />
  </div>;
}
