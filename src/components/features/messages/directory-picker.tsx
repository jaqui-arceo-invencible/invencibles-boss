"use client";

import { useState } from "react";
import { startConversation } from "@/app/app/messages/actions";
import { PersonAvatar } from "@/components/features/messages/person-avatar";
import type { DirectoryPerson } from "@/lib/messages/inbox";

export function DirectoryPicker({ people }: { people: DirectoryPerson[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle ? people.filter((person) => person.name.toLocaleLowerCase().includes(needle)) : people;
  return <div className="messages-pane">
    <form className="ds-form community-form" onSubmit={(event) => event.preventDefault()}>
      <label>Buscar por nombre
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Nombre" />
      </label>
    </form>
    {visible.length === 0 ? <p className="empty-copy">{people.length ? "Ninguna integrante coincide." : "No hay integrantes visibles en el directorio."}</p> : <ul className="conversation-list">
      {visible.map((person) => <li key={person.id}>
        <form action={startConversation}>
          <input type="hidden" name="user_id" value={person.id} />
          <button type="submit" className="conversation-row">
            <PersonAvatar name={person.name} url={person.avatarUrl} />
            <span className="conversation-copy"><strong>{person.name}</strong><small>Enviar mensaje</small></span>
          </button>
        </form>
      </li>)}
    </ul>}
  </div>;
}
