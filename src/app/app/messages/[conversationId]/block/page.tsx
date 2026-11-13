import { notFound } from "next/navigation";
import { blockMember, unblockMember } from "@/app/app/messages/actions";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton, SecondaryButton } from "@/components/design/buttons";
import { requireMember } from "@/lib/auth/guards";
import { loadThread } from "@/lib/messages/inbox";

export const instant = false;

export default async function BlockPersonPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const access = await requireMember();
  const thread = await loadThread(access, conversationId);
  if (!thread) notFound();
  return <main className="admin-page">
    <PageHeader title={thread.blockedByMe ? "Bloqueo" : "Bloquear"} backHref={`/app/messages/${thread.id}`} />
    <p className="form-hint">{thread.blockedByMe ? `${thread.otherName} está bloqueada. Puedes desbloquearla para volver a escribirle.` : `Si bloqueas a ${thread.otherName}, ninguna de las dos podrá enviar mensajes nuevos.`}</p>
    {thread.blockedByMe ? <form action={unblockMember}>
      <input type="hidden" name="user_id" value={thread.otherId} />
      <SecondaryButton type="submit">Desbloquear</SecondaryButton>
    </form> : <form action={blockMember}>
      <input type="hidden" name="user_id" value={thread.otherId} />
      <PrimaryButton type="submit">Bloquear</PrimaryButton>
    </form>}
  </main>;
}
