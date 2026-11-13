import type { AccessContext } from "@/lib/auth/guards";
import { formatLearningDateTime, isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

export type InboxItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  preview: string;
  when: string;
  unread: number;
};

export type ThreadMessage = {
  id: string;
  mine: boolean;
  body: string;
  deleted: boolean;
  when: string;
  seen: boolean;
};

export type ThreadView = {
  id: string;
  otherId: string;
  otherName: string;
  avatarUrl: string | null;
  blocked: boolean;
  blockedByMe: boolean;
  messages: ThreadMessage[];
};

export type DirectoryPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export async function loadInbox(access: AccessContext) {
  const db = await createClient();
  const { data } = await db
    .from("conversations")
    .select("id, participant_low, participant_high, updated_at")
    .eq("team_id", access.teamId)
    .order("updated_at", { ascending: false });
  const conversations = rows(data);
  const ids = conversations.flatMap((row) => {
    const id = text(row.id);
    return isUuid(id) ? [id] : [];
  });
  if (!ids.length) return [] as InboxItem[];
  const [previews, members, recent] = await Promise.all([
    db.from("direct_message_previews").select("conversation_id, content, created_at, deleted_at").in("conversation_id", ids),
    db.from("conversation_members").select("conversation_id, user_id, last_read_at").in("conversation_id", ids),
    db.from("direct_messages").select("conversation_id, sender_id, created_at").in("conversation_id", ids).is("deleted_at", null).order("created_at", { ascending: false }).limit(400),
  ]);
  const otherIds = conversations.map((row) => otherParticipant(row, access.userId));
  const people = await loadPeople(db, access.teamId, otherIds);
  const previewByConversation = new Map(rows(previews.data).map((row) => [text(row.conversation_id), row]));
  const readByConversation = new Map(rows(members.data).flatMap((row) => text(row.user_id) === access.userId ? [[text(row.conversation_id), text(row.last_read_at)]] as const : []));
  return conversations.flatMap((row) => {
    const id = text(row.id);
    if (!isUuid(id)) return [];
    const otherId = otherParticipant(row, access.userId);
    const person = people.get(otherId);
    const preview = previewByConversation.get(id);
    const deleted = Boolean(preview?.deleted_at);
    const cursor = readByConversation.get(id) ?? "";
    const unread = rows(recent.data).filter((message) => text(message.conversation_id) === id && text(message.sender_id) !== access.userId && !atOrAfter(cursor, text(message.created_at))).length;
    return [{
      id,
      name: person?.name ?? "Integrante",
      avatarUrl: person?.avatarUrl ?? null,
      preview: deleted ? "Mensaje eliminado" : text(preview?.content) || "Sin mensajes todavía",
      when: formatLearningDateTime(text(preview?.created_at) || text(row.updated_at) || null),
      unread,
    } satisfies InboxItem];
  });
}

export async function loadThread(access: AccessContext, conversationId: string) {
  if (!isUuid(conversationId)) return null;
  const db = await createClient();
  const { data } = await db.from("conversations").select("id, participant_low, participant_high").eq("id", conversationId).eq("team_id", access.teamId).maybeSingle();
  const conversation = record(data);
  if (!conversation) return null;
  const low = text(conversation.participant_low);
  const high = text(conversation.participant_high);
  if (access.userId !== low && access.userId !== high) return null;
  const otherId = access.userId === low ? high : low;
  const [messageResult, memberResult, blockResult, people] = await Promise.all([
    db.from("direct_messages").select("id, sender_id, content, created_at, deleted_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(200),
    db.from("conversation_members").select("user_id, last_read_at").eq("conversation_id", conversationId),
    db.from("user_blocks").select("blocker_id, blocked_id").eq("team_id", access.teamId).or(`and(blocker_id.eq.${access.userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${access.userId})`),
    loadPeople(db, access.teamId, [otherId]),
  ]);
  const otherRead = text(rows(memberResult.data).find((row) => text(row.user_id) === otherId)?.last_read_at);
  const blocks = rows(blockResult.data);
  const person = people.get(otherId);
  return {
    id: conversationId,
    otherId,
    otherName: person?.name ?? "Integrante",
    avatarUrl: person?.avatarUrl ?? null,
    blocked: blocks.length > 0,
    blockedByMe: blocks.some((row) => text(row.blocker_id) === access.userId),
    messages: rows(messageResult.data).reverse().flatMap((row) => {
      const id = text(row.id);
      if (!isUuid(id)) return [];
      const mine = text(row.sender_id) === access.userId;
      return [{
        id,
        mine,
        body: text(row.content),
        deleted: Boolean(row.deleted_at),
        when: formatLearningDateTime(text(row.created_at) || null),
        seen: mine && atOrAfter(otherRead, text(row.created_at)),
      } satisfies ThreadMessage];
    }),
  } satisfies ThreadView;
}

export async function loadDirectory(access: AccessContext) {
  const db = await createClient();
  const [memberships, blocks] = await Promise.all([
    db.from("memberships").select("user_id").eq("team_id", access.teamId).eq("status", "active"),
    db.from("user_blocks").select("blocker_id, blocked_id").eq("team_id", access.teamId),
  ]);
  const blocked = new Set(rows(blocks.data).flatMap((row) => {
    const blocker = text(row.blocker_id);
    const blockedId = text(row.blocked_id);
    if (blocker === access.userId) return [blockedId];
    if (blockedId === access.userId) return [blocker];
    return [];
  }));
  const ids = rows(memberships.data).map((row) => text(row.user_id)).filter((id) => isUuid(id) && id !== access.userId && !blocked.has(id));
  if (!ids.length) return [] as DirectoryPerson[];
  const { data } = await db.from("profiles").select("id, full_name, avatar_path").in("id", ids).eq("directory_visible", true);
  const people = await signPeople(db, access.teamId, rows(data));
  return [...people.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export async function loadBlockedPeople(access: AccessContext) {
  const db = await createClient();
  const { data } = await db.from("user_blocks").select("blocked_id").eq("team_id", access.teamId).eq("blocker_id", access.userId);
  const ids = rows(data).map((row) => text(row.blocked_id)).filter(isUuid);
  if (!ids.length) return [] as DirectoryPerson[];
  const { data: profiles } = await db.from("profiles").select("id, full_name, avatar_path").in("id", ids);
  const people = await signPeople(db, access.teamId, rows(profiles));
  return ids.map((id) => people.get(id) ?? { id, name: "Integrante", avatarUrl: null }).sort((left, right) => left.name.localeCompare(right.name, "es"));
}

async function loadPeople(db: Db, teamId: string, userIds: string[]) {
  const ids = [...new Set(userIds.filter(isUuid))];
  if (!ids.length) return new Map<string, DirectoryPerson>();
  const { data } = await db.from("profiles").select("id, full_name, avatar_path").in("id", ids);
  return signPeople(db, teamId, rows(data));
}

async function signPeople(db: Db, teamId: string, source: Row[]) {
  const paths = source.map((row) => text(row.avatar_path)).filter((path) => path.startsWith(`${teamId}/avatars/`));
  const signed = await signPaths(db, paths);
  const people = new Map<string, DirectoryPerson>();
  for (const row of source) {
    const id = text(row.id);
    if (!isUuid(id)) continue;
    const path = text(row.avatar_path);
    people.set(id, {
      id,
      name: text(row.full_name).trim() || "Integrante",
      avatarUrl: path.startsWith(`${teamId}/avatars/`) ? signed.get(path) || null : null,
    });
  }
  return people;
}

async function signPaths(db: Db, paths: string[]) {
  const unique = [...new Set(paths)];
  const signed = await Promise.all(unique.map(async (path) => {
    const result = await db.storage.from("academy-private").createSignedUrl(path, 300);
    return [path, result.data?.signedUrl ?? ""] as const;
  }));
  return new Map(signed.filter((entry) => entry[1]));
}

function otherParticipant(row: Row, userId: string) {
  return text(row.participant_low) === userId ? text(row.participant_high) : text(row.participant_low);
}

function atOrAfter(cursor: string, moment: string) {
  if (!cursor || !moment) return false;
  const left = Date.parse(cursor);
  const right = Date.parse(moment);
  return Number.isFinite(left) && Number.isFinite(right) && left >= right;
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => {
    const row = record(item);
    return row ? [row] : [];
  }) : [];
}

function record(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
