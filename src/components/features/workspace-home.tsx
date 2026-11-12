import { BookOpen, FileText, Library, Settings, Users } from "lucide-react";
import { SettingsLink, SettingsProfileHeader, SettingsSection } from "@/components/design/settings-section";
import type { TeamRole } from "@/types/database";

export function WorkspaceHome({ mode, role, name }: { mode: "member" | "admin"; role: TeamRole; name: string }) {
  const detail = role === "admin" ? "Administradora" : role === "editor" ? "Editora" : "Socia";
  return <div className="admin-page">
    <SettingsProfileHeader name={name} detail={detail} />
    {mode === "member" ? <SettingsSection title="Tu espacio">
      <SettingsLink href="/app/academy" label="Mi academia" detail="Módulos y lecciones publicados." icon={<BookOpen size={24} />} />
      <SettingsLink href="/perfil" label="Mi perfil" detail="Tu nombre y el acceso de tu cuenta." icon={<Users size={24} />} />
    </SettingsSection> : <SettingsSection title="Administración">
      <SettingsLink href="/admin/modules" label="Módulos y lecciones" detail="Editor de la academia." icon={<BookOpen size={24} />} />
      <SettingsLink href="/admin/library" label="Biblioteca de recursos" detail="Archivos privados del equipo." icon={<Library size={24} />} />
      {role === "admin" && <SettingsLink href="/admin/users" label="Usuarias" detail="Accesos y permisos." icon={<Users size={24} />} />}
      {role === "admin" && <SettingsLink href="/admin/invitations" label="Invitaciones" detail="Altas al equipo." icon={<FileText size={24} />} />}
      {role === "admin" && <SettingsLink href="/admin/configuracion" label="Configuración" detail="Datos de la cuenta administradora." icon={<Settings size={24} />} />}
    </SettingsSection>}
  </div>;
}
