import type { AccessContext } from "@/lib/auth/guards";
import { formatLearningDateTime, isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

export type ReportListItem = {
  id: string;
  reason: string;
  status: string;
  when: string;
  target: string;
};

export type ModerationPost = {
  id: string;
  excerpt: string;
  status: "visible" | "hidden";
  pinned: boolean;
};

export async function loadModerationQueue(access: AccessContext, status: string) {
  const db = await createClient();
  const filter = status === "resolved" || status === "dismissed" ? status : "open";
  const [reports, posts, openCount, hiddenCount] = await Promise.all([
    db.from("content_reports").select("id, reason, status, post_id, comment_id, message_id, created_at").eq("team_id", access.teamId).eq("status", filter).order("created_at", { ascending: false }).limit(40),
    db.from("community_posts").select("id, content, status, is_pinned").eq("team_id", access.teamId).order("created_at", { ascending: false }).limit(12),
    db.from("content_reports").select("id", { count: "exact", head: true }).eq("team_id", access.teamId).eq("status", "open"),
    db.from("community_posts").select("id", { count: "exact", head: true }).eq("team_id", access.teamId).eq("status", "hidden"),
  ]);
  return {
    filter,
    openCount: openCount.count ?? 0,
    hiddenCount: hiddenCount.count ?? 0,
    reports: rows(reports.data).flatMap((row) => {
      const id = text(row.id);
      if (!isUuid(id)) return [];
      return [{
        id,
        reason: text(row.reason),
        status: text(row.status) || "open",
        when: formatLearningDateTime(text(row.created_at) || null),
        target: text(row.message_id) ? "Mensaje privado" : text(row.comment_id) ? "Comentario" : "Publicación",
      } satisfies ReportListItem];
    }),
    posts: rows(posts.data).flatMap((row) => {
      const id = text(row.id);
      const content = text(row.content);
      if (!isUuid(id) || !content) return [];
      return [{
        id,
        excerpt: content.slice(0, 140),
        status: row.status === "hidden" ? "hidden" : "visible",
        pinned: row.is_pinned === true,
      } satisfies ModerationPost];
    }),
  };
}

export type ReportDetail = {
  id: string;
  reason: string;
  status: string;
  when: string;
  reporterName: string;
  targetLabel: string;
  targetExcerpt: string;
  postId: string;
  commentId: string;
  messageId: string;
  contentStatus: "visible" | "hidden" | "";
};

export async function loadReportDetail(access: AccessContext, reportId: string) {
  if (!isUuid(reportId)) return null;
  const db = await createClient();
  const { data } = await db.from("content_reports").select("id, reporter_id, reason, status, post_id, comment_id, message_id, created_at").eq("id", reportId).eq("team_id", access.teamId).maybeSingle();
  const report = record(data);
  if (!report || !isUuid(text(report.id))) return null;
  const reporter = await db.from("profiles").select("full_name").eq("id", text(report.reporter_id)).maybeSingle();
  const postId = text(report.post_id);
  const commentId = text(report.comment_id);
  const messageId = text(report.message_id);
  let targetLabel = "Publicación";
  let targetExcerpt = "El contenido ya no está disponible.";
  let contentStatus: ReportDetail["contentStatus"] = "";
  if (isUuid(postId)) {
    const post = await db.from("community_posts").select("content, status").eq("id", postId).eq("team_id", access.teamId).maybeSingle();
    const row = record(post.data);
    if (row) {
      targetExcerpt = text(row.content);
      contentStatus = row.status === "hidden" ? "hidden" : "visible";
    }
  } else if (isUuid(commentId)) {
    targetLabel = "Comentario";
    const comment = await db.from("community_comments").select("content, status").eq("id", commentId).eq("team_id", access.teamId).maybeSingle();
    const row = record(comment.data);
    if (row) {
      targetExcerpt = text(row.content);
      contentStatus = row.status === "hidden" ? "hidden" : "visible";
    }
  } else if (isUuid(messageId)) {
    targetLabel = "Mensaje privado reportado";
    const message = await db.from("direct_messages").select("content, deleted_at").eq("id", messageId).eq("team_id", access.teamId).maybeSingle();
    const row = record(message.data);
    if (row) targetExcerpt = row.deleted_at ? "La autora eliminó este mensaje." : text(row.content);
  }
  return {
    id: text(report.id),
    reason: text(report.reason),
    status: text(report.status) || "open",
    when: formatLearningDateTime(text(report.created_at) || null),
    reporterName: text(record(reporter.data)?.full_name).trim() || "Integrante",
    targetLabel,
    targetExcerpt,
    postId: isUuid(postId) ? postId : "",
    commentId: isUuid(commentId) ? commentId : "",
    messageId: isUuid(messageId) ? messageId : "",
    contentStatus,
  } satisfies ReportDetail;
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
