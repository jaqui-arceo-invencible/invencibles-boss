"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { PersonAvatar } from "@/components/features/messages/person-avatar";
import type { InboxItem } from "@/lib/messages/inbox";

export function ConversationList({ items }: { items: InboxItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle ? items.filter((item) => item.name.toLocaleLowerCase().includes(needle)) : items;
  return <div className="messages-pane">
    <PageHeader title="Mensajes" action={<Link href="/app/messages/new" className="ds-icon-button" aria-label="Nueva conversación"><Plus size={22} /></Link>} />
    <form className="ds-form community-form" onSubmit={(event) => event.preventDefault()}>
      <label>Buscar
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Nombre" />
      </label>
    </form>
    <Link href="/app/messages/blocked" className="community-quiet">Personas bloqueadas</Link>
    {visible.length === 0 ? <p className="empty-copy">{items.length ? "Ninguna conversación coincide." : "Todavía no tienes conversaciones."}</p> : <ul className="conversation-list">
      {visible.map((item) => <li key={item.id}>
        <Link href={`/app/messages/${item.id}`} className="conversation-row" aria-current={pathname === `/app/messages/${item.id}` ? "page" : undefined}>
          <PersonAvatar name={item.name} url={item.avatarUrl} />
          <span className="conversation-copy"><strong>{item.name}</strong><small>{item.preview}</small></span>
          <span className="conversation-meta"><time>{item.when}</time>{item.unread > 0 ? <span className="unread-count">{item.unread}</span> : null}</span>
        </Link>
      </li>)}
    </ul>}
  </div>;
}
