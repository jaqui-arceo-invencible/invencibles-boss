import { AppShell } from "@/components/layout/app-shell";
import { requireMember } from "@/lib/auth/guards";
import type { TeamRole } from "@/types/database";

export const instant = false;

function roleLabel(role: TeamRole) {
  if (role === "admin") return "Administradora";
  if (role === "editor") return "Editora";
  return "Socia";
}

export default async function ProfilePage() {
  const access = await requireMember();
  return <AppShell mode="member" role={access.role} name={access.fullName}><div className="admin-page">
    <div className="admin-page-heading"><div>
      <span className="eyebrow">PREFERENCIAS</span>
      <h1>Mi perfil</h1>
      <p>Datos de tu cuenta en Invencibles Boss.</p>
    </div></div>
    <dl className="account-facts">
      <div><dt>Nombre</dt><dd>{access.fullName || "Sin nombre"}</dd></div>
      <div><dt>Correo</dt><dd>{access.email || "Sin correo"}</dd></div>
      <div><dt>Rol</dt><dd>{roleLabel(access.role)}</dd></div>
    </dl>
  </div></AppShell>;
}
