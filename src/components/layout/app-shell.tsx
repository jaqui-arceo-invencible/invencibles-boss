"use client";

/* eslint-disable @next/next/no-img-element -- Private signed avatar URLs must not pass through a shared image optimizer cache. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Home, LayoutDashboard, Library, MessageSquare, Settings, Shield, UserRound, Users } from "lucide-react";
import type { TeamRole } from "@/types/database";
import { SignOutButton } from "@/components/features/sign-out-button";
import { NotificationBell } from "@/components/features/notices/notification-bell";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

type NavItem = { label: string; short?: string; href: string; icon: typeof Home; mobile?: boolean };
type AppShellProps = { mode: "member" | "admin"; children: React.ReactNode; role: TeamRole; name: string; avatarUrl?: string | null; userId?: string; unreadCount?: number };

const memberNav: NavItem[] = [
  { label: "Inicio", short: "Inicio", href: "/app", icon: Home },
  { label: "Mi academia", short: "Academia", href: "/app/academy", icon: BookOpen },
  { label: "Comunidad", short: "Comunidad", href: "/app/community", icon: Users },
  { label: "Mensajes", short: "Mensajes", href: "/app/messages", icon: MessageSquare, mobile: false },
  { label: "Mis recursos", short: "Recursos", href: "/app/resources", icon: Library, mobile: false },
  { label: "Mis avances", short: "Avances", href: "/app/progress", icon: FileText },
  { label: "Mi perfil", short: "Perfil", href: "/app/profile", icon: UserRound },
  { label: "Configuración", href: "/app/configuracion", icon: Settings, mobile: false },
];

const adminNav: NavItem[] = [
  { label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { label: "Módulos y lecciones", href: "/admin/modules", icon: BookOpen },
  { label: "Biblioteca de recursos", href: "/admin/library", icon: Library },
  { label: "Moderación", href: "/admin/community", icon: Shield },
  { label: "Integrantes", href: "/admin/users", icon: Users },
  { label: "Invitaciones", href: "/admin/invitations", icon: FileText },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

const hiddenFromEditor = new Set(["Moderación", "Integrantes", "Invitaciones", "Configuración"]);

export function AppShell({ mode, children, role, name, avatarUrl, userId, unreadCount = 0 }: AppShellProps) {
  const pathname = usePathname();
  const items = mode === "admin" ? adminNav.filter((item) => role === "admin" || !hiddenFromEditor.has(item.label)) : memberNav;
  const current = items.find((item) => navActive(pathname, item.href));
  const area = mode === "admin" ? "Administración" : "Mi espacio";
  const roleLabel = role === "admin" ? "Administradora" : role === "editor" ? "Editora" : "Socia";

  return <SidebarProvider data-area={mode} data-section={pathname.split("/")[2] ?? "home"} className={mode === "member" ? "app-frame member-shell" : "app-frame"} style={{ "--sidebar-width": "252px", "--sidebar-width-mobile": "290px" } as React.CSSProperties}>
    <a className="skip-content" href="#workspace-content">Ir al contenido</a>
    <Sidebar collapsible="icon" className="app-sidebar">
      <SidebarHeader>
        <div className="sidebar-brand"><div className="brand-mark"><img className="workspace-brand-logo" src="/brand/jacqui-logo.webp" alt="Jacqui Arceo" width={36} height={36} /></div><div><strong>Invencibles</strong><span>boss academy</span></div></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">ESPACIO DE TRABAJO</SidebarGroupLabel>
          <SidebarMenu>{items.map(({ label, href, icon: Icon }) => {
            const active = navActive(pathname, href);
            return <SidebarMenuItem key={href}><SidebarMenuButton render={<Link href={href} aria-current={active ? "page" : undefined} />} isActive={active} tooltip={label}><Icon size={18} strokeWidth={1.8} /><span className="group-data-[collapsible=icon]:hidden">{label}</span></SidebarMenuButton></SidebarMenuItem>;
          })}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="profile-row group-data-[collapsible=icon]:hidden">{avatarUrl ? <img className="profile-avatar profile-avatar-image" src={avatarUrl} alt="" /> : <div className="profile-avatar">{name.slice(0, 1).toLocaleUpperCase() || "I"}</div>}<span><b>{name || "Integrante"}</b><small>{roleLabel}</small></span><SignOutButton /></div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="main-column">
      <header className="topbar"><SidebarTrigger className="sidebar-toggle" aria-label="Abrir o cerrar menú" /><div className="breadcrumbs"><span>{area}</span><span className="crumb-separator">/</span><strong>{current?.label ?? area}</strong></div>{mode === "member" && userId ? <NotificationBell userId={userId} count={unreadCount} /> : null}</header>
      <div className="page-content" id="workspace-content" tabIndex={-1}>{children}</div>
      {mode === "member" ? <MemberBottomNav items={items} pathname={pathname} /> : null}
    </SidebarInset>
  </SidebarProvider>;
}

function navActive(pathname: string, href: string) {
  if (href === "/app" || href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MemberBottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return <nav className="member-bottom-nav" aria-label="Secciones principales">
    {items.filter((item) => item.mobile !== false).map(({ label, short, href, icon: Icon }) => {
      const active = navActive(pathname, href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={20} strokeWidth={1.8} aria-hidden="true" /><span>{short ?? label}</span></Link>;
    })}
  </nav>;
}
