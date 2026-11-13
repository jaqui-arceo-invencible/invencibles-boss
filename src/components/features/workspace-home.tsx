import { BookOpen, FileText, Library, Settings, Shield, Users } from "lucide-react";
import { SettingsLink, SettingsProfileHeader, SettingsSection } from "@/components/design/settings-section";
import { PageHeader } from "@/components/design/page-header";
import type { TeamRole } from "@/types/database";

export function WorkspaceHome({ mode, role, name }: { mode: "member" | "admin"; role: TeamRole; name: string }) {
  const detail = role === "admin" ? "Administradora" : role === "editor" ? "Editora" : "Socia";
  if (mode === "admin") return <main className="admin-page admin-home">
    <PageHeader title="Centro de administración" />
    <p className="ds-lead">{name ? `Hola, ${name}. ` : ""}Elige qué quieres gestionar.</p>
    <SettingsSection title="Contenido y capacitación">
      <SettingsLink href="/admin/modules" label="Módulos y lecciones" detail="Crear, editar y publicar la capacitación." icon={<BookOpen size={24} />} />
      <SettingsLink href="/admin/library" label="Biblioteca" detail="Subir y organizar imágenes y documentos." icon={<Library size={24} />} />
    </SettingsSection>
    {role === "admin" ? <SettingsSection title="Equipo y comunidad">
      <SettingsLink href="/admin/users" label="Integrantes" detail="Revisar accesos, estados y permisos." icon={<Users size={24} />} />
      <SettingsLink href="/admin/invitations" label="Invitaciones" detail="Invitar integrantes y consultar envíos." icon={<FileText size={24} />} />
      <SettingsLink href="/admin/community" label="Moderación" detail="Atender reportes y gestionar publicaciones." icon={<Shield size={24} />} />
      <SettingsLink href="/admin/configuracion" label="Configuración" detail="Consultar los datos de administración." icon={<Settings size={24} />} />
    </SettingsSection> : null}
  </main>;
  return <div className="admin-page">
    <PageHeader title="Tu espacio" />
    <SettingsProfileHeader name={name} detail={detail} />
    <SettingsSection title="Tu espacio">
      <SettingsLink href="/app/academy" label="Mi academia" detail="Módulos y lecciones publicados." icon={<BookOpen size={24} />} />
      <SettingsLink href="/perfil" label="Mi perfil" detail="Tu nombre y el acceso de tu cuenta." icon={<Users size={24} />} />
    </SettingsSection>
  </div>;
}
