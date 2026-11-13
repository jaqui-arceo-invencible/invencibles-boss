import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMessage } from "@/app/app/messages/actions";
import { PageHeader } from "@/components/design/page-header";
import { CommunityText } from "@/components/features/community/community-text";
import { MarkRead, MessageComposer } from "@/components/features/messages/message-composer";
import { PersonAvatar } from "@/components/features/messages/person-avatar";
import { RealtimeRefresh } from "@/components/features/notices/realtime-refresh";
import { requireMember } from "@/lib/auth/guards";
import { loadThread } from "@/lib/messages/inbox";

export const instant = false;

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const access = await requireMember();
  const thread = await loadThread(access, conversationId);
  if (!thread) notFound();
  return <div className="messages-pane">
    <RealtimeRefresh channel={`messages-${thread.id}`} table="direct_messages" filter={`conversation_id=eq.${thread.id}`} />
    <MarkRead conversationId={thread.id} />
    <PageHeader title={thread.otherName} backHref="/app/messages" action={<PersonAvatar name={thread.otherName} url={thread.avatarUrl} />} />
    {thread.messages.length === 0 ? <p className="empty-copy">Esta conversación todavía no tiene mensajes.</p> : <ol className="message-log">
      {thread.messages.map((message) => <li key={message.id} className={message.mine ? "mine" : "theirs"}>
        {message.deleted ? <p className="message-deleted">Mensaje eliminado</p> : <CommunityText text={message.body} />}
        <small>{message.when}{message.seen ? " · Leído" : ""}</small>
        {message.mine && !message.deleted ? <form action={deleteMessage}>
          <input type="hidden" name="message_id" value={message.id} />
          <input type="hidden" name="conversation_id" value={thread.id} />
          <button type="submit" className="community-quiet">Eliminar</button>
        </form> : null}
        {!message.mine && !message.deleted ? <Link href={`/app/community/report?message=${message.id}&conversation=${thread.id}`} className="community-quiet">Reportar</Link> : null}
      </li>)}
    </ol>}
    {thread.blocked ? <p className="form-hint">Esta conversación no acepta mensajes nuevos.</p> : <MessageComposer conversationId={thread.id} />}
    <Link href={`/app/messages/${thread.id}/block`} className="community-quiet">{thread.blockedByMe ? "Administrar bloqueo" : "Bloquear"}</Link>
  </div>;
}
