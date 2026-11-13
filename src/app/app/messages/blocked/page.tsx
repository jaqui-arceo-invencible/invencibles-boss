import { PageHeader } from "@/components/design/page-header";
import { SecondaryButton } from "@/components/design/buttons";
import { PersonAvatar } from "@/components/features/messages/person-avatar";
import { unblockMember } from "@/app/app/messages/actions";
import { requireMember } from "@/lib/auth/guards";
import { loadBlockedPeople } from "@/lib/messages/inbox";

export const instant = false;

export default async function BlockedPeoplePage() {
  const access = await requireMember();
  const people = await loadBlockedPeople(access);
  return <>
    <PageHeader title="Personas bloqueadas" backHref="/app/messages" />
    {people.length === 0 ? <p className="empty-copy">No has bloqueado a nadie.</p> : <ul className="conversation-list">
      {people.map((person) => <li key={person.id} className="conversation-row">
        <PersonAvatar name={person.name} url={person.avatarUrl} />
        <span className="conversation-copy"><strong>{person.name}</strong></span>
        <form action={unblockMember}>
          <input type="hidden" name="user_id" value={person.id} />
          <SecondaryButton type="submit">Desbloquear</SecondaryButton>
        </form>
      </li>)}
    </ul>}
  </>;
}
