import { requireAdmin } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminSettingsPage() {
  const access = await requireAdmin();
  return <div className="admin-page">
    <div className="admin-page-heading"><div>
      <span className="eyebrow">PREFERENCIAS</span>
      <h1>Configuración</h1>
      <p>Datos de la cuenta que administra el equipo.</p>
    </div></div>
    <dl className="account-facts">
      <div><dt>Nombre</dt><dd>{access.fullName || "Sin nombre"}</dd></div>
      <div><dt>Correo</dt><dd>{access.email || "Sin correo"}</dd></div>
      <div><dt>Rol</dt><dd>Administradora</dd></div>
    </dl>
  </div>;
}
