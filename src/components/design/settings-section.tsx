import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SettingsProfileHeader({ name, detail }: { name: string; detail: string }) {
  return <div className="ds-profile">
    <span className="ds-profile-avatar" aria-hidden="true">{name.slice(0, 1).toLocaleUpperCase() || "I"}</span>
    <div><strong>{name || "Integrante"}</strong><small>{detail}</small></div>
  </div>;
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="ds-section"><h2>{title}</h2><div className="ds-section-body">{children}</div></section>;
}

export function SettingsLink({ href, label, detail, icon }: { href: string; label: string; detail?: string; icon?: React.ReactNode }) {
  return <Link href={href} className="ds-row">{icon ? <span className="ds-row-icon">{icon}</span> : null}<span className="ds-row-copy"><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span><ChevronRight size={24} aria-hidden="true" /></Link>;
}
