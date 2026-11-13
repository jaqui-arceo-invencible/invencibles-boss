import type { AccessContext } from "@/lib/auth/guards";
import { formatLearningDateTime, isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

export type NoticeItem = {
  id: string;
  title: string;
  body: string;
  when: string;
  read: boolean;
};

export async function countUnread() {
  const db = await createClient();
  const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function loadNotices() {
  const db = await createClient();
  const { data } = await db
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  return rows(data).flatMap((row) => {
    const id = text(row.id);
    const title = text(row.title);
    if (!isUuid(id) || !title) return [];
    return [{
      id,
      title,
      body: text(row.body),
      when: formatLearningDateTime(text(row.created_at) || null),
      read: Boolean(row.read_at),
    } satisfies NoticeItem];
  });
}

export async function noticeDestination(access: AccessContext, noticeId: string) {
  if (!isUuid(noticeId)) return null;
  const db = await createClient();
  const { data } = await db
    .from("notifications")
    .select("id, type, post_id, lesson_id, conversation_id")
    .eq("id", noticeId)
    .maybeSingle();
  const notice = record(data);
  if (!notice) return null;
  const conversationId = text(notice.conversation_id);
  if (isUuid(conversationId)) {
    const conversation = await db.from("conversations").select("id").eq("id", conversationId).eq("team_id", access.teamId).maybeSingle();
    return conversation.data ? `/app/messages/${conversationId}` : null;
  }
  const lessonId = text(notice.lesson_id);
  if (notice.type === "lesson_reply" && isUuid(lessonId)) return lessonPath(db, access.teamId, lessonId);
  const postId = text(notice.post_id);
  if (!isUuid(postId)) return null;
  const post = await db.from("community_posts").select("id").eq("id", postId).eq("team_id", access.teamId).maybeSingle();
  return post.data ? `/app/community/${postId}` : null;
}

async function lessonPath(db: Db, teamId: string, lessonId: string) {
  const { data, error } = await db.from("lessons").select("slug, status, modules!inner(slug, status, team_id)").eq("id", lessonId).maybeSingle();
  if (error) return null;
  const lesson = record(data);
  const course = joined(lesson?.modules);
  if (!lesson || !course) return null;
  if (text(course.team_id) !== teamId || lesson.status !== "published" || course.status !== "published") return null;
  const courseSlug = text(course.slug);
  const lessonSlug = text(lesson.slug);
  return courseSlug && lessonSlug ? `/app/academy/${courseSlug}/${lessonSlug}` : null;
}

function joined(value: unknown): Row | null {
  if (Array.isArray(value)) return record(value[0]);
  return record(value);
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
