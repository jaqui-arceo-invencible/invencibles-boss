"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BookOpen, ChevronDown, CircleHelp, FileText, Home, LayoutDashboard,
  Library, MessageCircle, Search, Settings, Sparkles, Users,
} from "lucide-react";
import type { TeamRole } from "@/types/database";
import { SignOutButton } from "@/components/features/sign-out-button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

type NavItem = { label: string; href: string; icon: typeof Home };
type AppShellProps = { mode: "member" | "admin"; children: React.ReactNode; role: TeamRole; name: string };

const memberNav: NavItem[] = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Mi academia", href: "/app/academy", icon: BookOpen },
  { label: "Recursos", href: "/recursos", icon: Library },
  { label: "Comunidad", href: "/comunidad", icon: MessageCircle },
  { label: "Mis avances", href: "/avances", icon: Activity },
  { label: "Mi perfil", href: "/perfil", icon: Users },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Módulos y lecciones", href: "/admin/modules", icon: BookOpen },
  { label: "Biblioteca de recursos", href: "/admin/library", icon: Library },
  { label: "Usuarias", href: "/admin/users", icon: Users },
  { label: "Invitaciones", href: "/admin/invitations", icon: FileText },
  { label: "Comunidad", href: "/admin/comunidad", icon: MessageCircle },
  { label: "Estadísticas", href: "/admin/estadisticas", icon: Activity },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function AppShell({ mode, children, role, name }: AppShellProps) {
  const pathname = usePathname();
  const items = mode === "admin" ? adminNav.filter((item) => role === "admin" || !["Usuarias", "Invitaciones", "Configuración"].includes(item.label)) : memberNav;
  const title = mode === "admin" ? "Panel de administración" : "Portal de socias";

  return <SidebarProvider className="app-frame" style={{ "--sidebar-width": "252px", "--sidebar-width-mobile": "290px" } as React.CSSProperties}>
    <Sidebar collapsible="icon" className="app-sidebar">
      <SidebarHeader>
        <div className="sidebar-brand"><div className="brand-mark"><Sparkles size={19} aria-hidden="true" /></div><div><strong>Invencibles</strong><span>boss academy</span></div></div>
        <div className="team-switcher group-data-[collapsible=icon]:hidden"><span className="team-avatar">IB</span><span><b>Invencibles Boss</b><small>{title}</small></span><ChevronDown size={15} /></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">ESPACIO DE TRABAJO</SidebarGroupLabel>
          <SidebarMenu>{items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return <SidebarMenuItem key={href}><SidebarMenuButton render={<Link href={href} aria-current={active ? "page" : undefined} />} isActive={active} tooltip={label}><Icon size={18} strokeWidth={1.8} /><span className="group-data-[collapsible=icon]:hidden">{label}</span>{label === "Comunidad" && mode === "member" && <span className="nav-dot group-data-[collapsible=icon]:hidden" />}</SidebarMenuButton></SidebarMenuItem>;
          })}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="support-card group-data-[collapsible=icon]:hidden"><div className="support-icon"><CircleHelp size={17} /></div><strong>¿Necesitas ayuda?</strong><p>Estamos aquí para acompañarte.</p><button type="button">Visitar centro de ayuda <span>↗</span></button></div>
        <div className="profile-row group-data-[collapsible=icon]:hidden"><div className="profile-avatar">{name.slice(0, 1).toLocaleUpperCase() || "I"}</div><span><b>{name || "Integrante"}</b><small>{role === "admin" ? "Administradora" : role === "editor" ? "Editora" : "Socia"}</small></span><SignOutButton /></div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="main-column">
      <header className="topbar"><SidebarTrigger className="sidebar-toggle" aria-label="Abrir o cerrar menú" /><div className="breadcrumbs"><span>{mode === "admin" ? "Administración" : "Mi espacio"}</span><span className="crumb-separator">/</span><strong>{mode === "admin" ? "Dashboard" : "Inicio"}</strong></div><div className="topbar-actions"><button type="button" className="search-pill"><Search size={16} /><span>Buscar en tu espacio</span><kbd>⌘ K</kbd></button><button className="icon-button notification-button" aria-label="Notificaciones" type="button"><span className="notification-dot" />♧</button><div className="profile-avatar top-avatar">M</div></div></header>
      <main className="page-content">{children}</main>
    </SidebarInset>
  </SidebarProvider>;
}
