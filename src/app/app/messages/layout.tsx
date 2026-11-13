import { requireMember } from "@/lib/auth/guards";
import { ConversationList } from "@/components/features/messages/conversation-list";
import { MessagesFrame } from "@/components/features/messages/messages-frame";
import { loadInbox } from "@/lib/messages/inbox";

export const instant = false;

export default async function MessagesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireMember();
  const inbox = await loadInbox(access);
  return <MessagesFrame list={<ConversationList items={inbox} />}>{children}</MessagesFrame>;
}
