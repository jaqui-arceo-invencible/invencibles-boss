"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BookOpen, ChevronDown, CircleHelp, FileText, Home, LayoutDashboard,
  Library, MessageCircle, Search, Settings, Sparkles, Users,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

type NavItem = { label: string; href: string; icon: typeof Home };
type AppShellProps = { mode: "member" | "admin"; children: React.ReactNode };

const memberNav: NavItem[] = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Mi academia", href: "/academia", icon: BookOpen },
  { label: "Recursos", href: "/recursos", icon: Library },
  { label: "Comunidad", href: "/comunidad", icon: MessageCircle },
  { label: "Mis avances", href: "/avances", icon: Activity },
  { label: "Mi perfil", href: "/perfil", icon: Users },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Módulos y lecciones", href: "/admin/modulos", icon: BookOpen },
  { label: "Biblioteca de recursos", href: "/admin/recursos", icon: Library },
  { label: "Usuarias", href: "/admin/usuarias", icon: Users },
  { label: "Invitaciones", href: "/admin/invitaciones", icon: FileText },
  { label: "Comunidad", href: "/admin/comunidad", icon: MessageCircle },
  { label: "Estadísticas", href: "/admin/estadisticas", icon: Activity },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function AppShell({ mode, children }: AppShellProps) {
  const pathname = usePathname();
  const items = mode === "admin" ? adminNav : memberNav;
  const title = mode === "admin" ? "Panel de administración" : "Portal de socias";

  return <SidebarProvider className="app-frame" style={{ "--sidebar-width": "252px", "--sidebar-width-mobile": "290px" } as React.CSSProperties}>
    <Sidebar collapsible="icon" className="app-sidebar">
      <SidebarHeader>
        <div className="sidebar-brand"><div className="brand-mark"><Sparkles size={19} aria-hidden="true" /></div><div><strong>Invencibles</strong><span>boss academy</span></div></div>
        <div className="team-switcher"><span className="team-avatar">IB</span><span><b>Invencibles Boss</b><small>{title}</small></span><ChevronDown size={15} /></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>ESPACIO DE TRABAJO</SidebarGroupLabel>
          <SidebarMenu>{items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return <SidebarMenuItem key={href}><SidebarMenuButton render={<Link href={href} aria-current={active ? "page" : undefined} />} isActive={active} tooltip={label}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Comunidad" && mode === "member" && <span className="nav-dot" />}</SidebarMenuButton></SidebarMenuItem>;
          })}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="support-card"><div className="support-icon"><CircleHelp size={17} /></div><strong>¿Necesitas ayuda?</strong><p>Estamos aquí para acompañarte.</p><button type="button">Visitar centro de ayuda <span>↗</span></button></div>
        <div className="profile-row"><div className="profile-avatar">M</div><span><b>María Fernanda</b><small>{mode === "admin" ? "Administradora" : "Socia"}</small></span><button aria-label="Opciones de perfil" type="button" className="icon-button"><ChevronDown size={16} /></button></div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="main-column">
      <header className="topbar"><SidebarTrigger className="sidebar-toggle" aria-label="Abrir o cerrar menú" /><div className="breadcrumbs"><span>{mode === "admin" ? "Administración" : "Mi espacio"}</span><span className="crumb-separator">/</span><strong>{mode === "admin" ? "Dashboard" : "Inicio"}</strong></div><div className="topbar-actions"><button type="button" className="search-pill"><Search size={16} /><span>Buscar en tu espacio</span><kbd>⌘ K</kbd></button><button className="icon-button notification-button" aria-label="Notificaciones" type="button"><span className="notification-dot" />♧</button><div className="profile-avatar top-avatar">M</div></div></header>
      <main className="page-content">{children}</main>
    </SidebarInset>
  </SidebarProvider>;
}
