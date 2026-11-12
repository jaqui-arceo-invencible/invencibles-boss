import Link from "next/link";
import type { TeamRole } from "@/types/database";

type HomeLink = { href: string; title: string; description: string };

const memberLinks: HomeLink[] = [
  { href: "/app/academy", title: "Mi academia", description: "Módulos y lecciones publicados." },
  { href: "/perfil", title: "Mi perfil", description: "Tu nombre y el acceso de tu cuenta." },
];

const adminLinks: Array<HomeLink & { roles: TeamRole[] }> = [
  { href: "/admin/modules", title: "Módulos y lecciones", description: "Editor de la academia.", roles: ["admin", "editor"] },
  { href: "/admin/library", title: "Biblioteca de recursos", description: "Archivos privados del equipo.", roles: ["admin", "editor"] },
  { href: "/admin/users", title: "Usuarias", description: "Accesos y permisos.", roles: ["admin"] },
  { href: "/admin/invitations", title: "Invitaciones", description: "Altas al equipo.", roles: ["admin"] },
  { href: "/admin/configuracion", title: "Configuración", description: "Datos de la cuenta administradora.", roles: ["admin"] },
];

export function WorkspaceHome({ mode, role, name }: { mode: "member" | "admin"; role: TeamRole; name: string }) {
  const links = mode === "member" ? memberLinks : adminLinks.filter((item) => item.roles.includes(role));
  return <div className="admin-page">
    <div className="admin-page-heading"><div>
      <span className="eyebrow">{mode === "admin" ? "ADMINISTRACIÓN" : "TU ESPACIO"}</span>
      <h1>{name ? `Hola, ${name}` : "Hola"}</h1>
      <p>{mode === "admin" ? "Entra a las secciones que ya están en uso." : "Continúa por tu academia o revisa tu perfil."}</p>
    </div></div>
    <div className="home-links">{links.map((link) => <Link href={link.href} key={link.href}><h2>{link.title}</h2><p>{link.description}</p><span>Abrir</span></Link>)}</div>
  </div>;
}
