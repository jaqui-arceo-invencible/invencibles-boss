import type { AccessContext } from "@/lib/auth/guards";
import { formatLearningDateTime, isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types/database";

export const COMMUNITY_PAGE_SIZE = 8;

type Db = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

export type CommunityCategory = { id: string; name: string; slug: string };
export type CommunityImage = { id: string; url: string; position: number };
export type CommunityComment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorRole: TeamRole;
  avatarUrl: string | null;
  content: string;
  createdLabel: string;
  edited: boolean;
};
export type CommunityPostCard = {
  id: string;
  content: string;
  status: "visible" | "hidden";
  pinned: boolean;
  createdLabel: string;
  edited: boolean;
  authorId: string;
  authorName: string;
  authorRole: TeamRole;
  avatarUrl: string | null;
  categoryId: string;
  categoryName: string;
  images: CommunityImage[];
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export async function loadCategories(teamId: string) {
  const db = await createClient();
  const { data } = await db.from("community_categories").select("id, name, slug, position").eq("team_id", teamId).order("position");
  return rows(data).flatMap((row) => {
    const id = text(row.id);
    const name = text(row.name);
    const slug = text(row.slug);
    return isUuid(id) && name && slug ? [{ id, name, slug }] : [];
  });
}

export async function loadCommunityFeed(access: AccessContext, search: { q?: string; category?: string; page?: string }) {
  const db = await createClient();
  const categories = await loadCategories(access.teamId);
  const selected = categories.find((item) => item.slug === (search.category ?? ""));
  const requested = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const queryText = (search.q ?? "").trim().slice(0, 80);
  let query = db
    .from("community_posts")
    .select("id, content, status, is_pinned, created_at, edited_at, author_id, category_id", { count: "exact" })
    .eq("team_id", access.teamId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (selected) query = query.eq("category_id", selected.id);
  if (queryText) query = query.ilike("content", `%${queryText.replace(/[%_\\]/g, "")}%`);
  const from = (page - 1) * COMMUNITY_PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + COMMUNITY_PAGE_SIZE - 1);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / COMMUNITY_PAGE_SIZE));
  if (error) return { categories, posts: [] as CommunityPostCard[], page: 1, pageCount: 1, total: 0, query: queryText, category: selected?.slug ?? "", failed: true };
  const posts = await hydratePosts(db, access, rows(data), categories);
  return { categories, posts, page: Math.min(page, pageCount), pageCount, total, query: queryText, category: selected?.slug ?? "", failed: false };
}

export async function loadCommunityPost(access: AccessContext, postId: string) {
  if (!isUuid(postId)) return null;
  const db = await createClient();
  const categories = await loadCategories(access.teamId);
  const { data } = await db
    .from("community_posts")
    .select("id, content, status, is_pinned, created_at, edited_at, author_id, category_id")
    .eq("id", postId)
    .eq("team_id", access.teamId)
    .maybeSingle();
  const row = record(data);
  if (!row) return null;
  const [post] = await hydratePosts(db, access, [row], categories);
  if (!post) return null;
  const comments = await loadComments(db, access, { postId });
  return { post, comments, categories };
}

export async function loadPinnedAnnouncement(teamId: string) {
  const db = await createClient();
  const { data } = await db.from("community_posts").select("id, content").eq("team_id", teamId).eq("status", "visible").eq("is_pinned", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const row = record(data);
  const id = text(row?.id);
  const content = text(row?.content);
  if (!isUuid(id) || !content) return null;
  return { id, excerpt: content.slice(0, 140) };
}

export async function loadLessonThread(access: AccessContext, lessonId: string) {
  const db = await createClient();
  const { data } = await db.from("lessons").select("comments_enabled, status").eq("id", lessonId).maybeSingle();
  const lesson = record(data);
  const open = lesson?.comments_enabled !== false && lesson?.status === "published";
  const comments = await loadComments(db, access, { lessonId });
  return { open, comments };
}

async function hydratePosts(db: Db, access: AccessContext, source: Row[], categories: CommunityCategory[]) {
  const ids = source.flatMap((row) => {
    const id = text(row.id);
    return isUuid(id) ? [id] : [];
  });
  if (!ids.length) return [] as CommunityPostCard[];
  const [imagesResult, reactionsResult, commentsResult] = await Promise.all([
    db.from("post_images").select("id, post_id, storage_path, position").in("post_id", ids).order("position"),
    db.from("post_reactions").select("post_id, user_id").in("post_id", ids),
    db.from("community_comments").select("post_id").in("post_id", ids),
  ]);
  const authors = await loadAuthors(db, access.teamId, source.map((row) => text(row.author_id)));
  const imageRows = rows(imagesResult.data);
  const signed = await signPaths(db, access.teamId, [
    ...[...authors.values()].flatMap((author) => author.avatarPath ? [author.avatarPath] : []),
    ...imageRows.map((row) => text(row.storage_path)),
  ]);
  const reactions = rows(reactionsResult.data);
  const commentRows = rows(commentsResult.data);
  return source.flatMap((row) => {
    const id = text(row.id);
    if (!isUuid(id)) return [];
    const author = authors.get(text(row.author_id));
    const category = categories.find((item) => item.id === text(row.category_id));
    const status = row.status === "hidden" ? "hidden" : "visible";
    return [{
      id,
      content: text(row.content),
      status,
      pinned: row.is_pinned === true,
      createdLabel: formatLearningDateTime(text(row.created_at) || null),
      edited: typeof row.edited_at === "string",
      authorId: text(row.author_id),
      authorName: author?.name || "Integrante",
      authorRole: author?.role ?? "member",
      avatarUrl: author?.avatarPath ? signed.get(author.avatarPath) || null : null,
      categoryId: text(row.category_id),
      categoryName: category?.name || "General",
      images: imageRows.flatMap((image) => {
        if (text(image.post_id) !== id) return [];
        const path = text(image.storage_path);
        const url = signed.get(path);
        const imageId = text(image.id);
        return url && isUuid(imageId) ? [{ id: imageId, url, position: typeof image.position === "number" ? image.position : 0 }] : [];
      }),
      likeCount: reactions.filter((reaction) => text(reaction.post_id) === id).length,
      likedByMe: reactions.some((reaction) => text(reaction.post_id) === id && text(reaction.user_id) === access.userId),
      commentCount: commentRows.filter((comment) => text(comment.post_id) === id).length,
    } satisfies CommunityPostCard];
  });
}

async function loadComments(db: Db, access: AccessContext, filter: { postId?: string; lessonId?: string }) {
  let query = db
    .from("community_comments")
    .select("id, author_id, parent_id, content, created_at, edited_at")
    .eq("team_id", access.teamId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (filter.postId) query = query.eq("post_id", filter.postId);
  if (filter.lessonId) query = query.eq("lesson_id", filter.lessonId);
  const { data } = await query;
  const source = rows(data);
  const authors = await loadAuthors(db, access.teamId, source.map((row) => text(row.author_id)));
  const signed = await signPaths(db, access.teamId, [...authors.values()].flatMap((author) => author.avatarPath ? [author.avatarPath] : []));
  return source.flatMap((row) => {
    const id = text(row.id);
    if (!isUuid(id)) return [];
    const author = authors.get(text(row.author_id));
    const parentId = text(row.parent_id);
    return [{
      id,
      parentId: isUuid(parentId) ? parentId : null,
      authorId: text(row.author_id),
      authorName: author?.name || "Integrante",
      authorRole: author?.role ?? "member",
      avatarUrl: author?.avatarPath ? signed.get(author.avatarPath) || null : null,
      content: text(row.content),
      createdLabel: formatLearningDateTime(text(row.created_at) || null),
      edited: typeof row.edited_at === "string",
    } satisfies CommunityComment];
  });
}

async function loadAuthors(db: Db, teamId: string, userIds: string[]) {
  const ids = [...new Set(userIds.filter(isUuid))];
  const authors = new Map<string, { name: string; role: TeamRole; avatarPath: string | null }>();
  if (!ids.length) return authors;
  const [profiles, memberships] = await Promise.all([
    db.from("profiles").select("id, full_name, avatar_path").in("id", ids),
    db.from("memberships").select("user_id, role").eq("team_id", teamId).eq("status", "active").in("user_id", ids),
  ]);
  const roles = new Map(rows(memberships.data).map((row) => [text(row.user_id), role(row.role)]));
  for (const profile of rows(profiles.data)) {
    const id = text(profile.id);
    const avatarPath = text(profile.avatar_path);
    authors.set(id, {
      name: text(profile.full_name).trim() || "Integrante",
      role: roles.get(id) ?? "member",
      avatarPath: avatarPath.startsWith(`${teamId}/avatars/`) ? avatarPath : null,
    });
  }
  return authors;
}

async function signPaths(db: Db, teamId: string, paths: string[]) {
  const unique = [...new Set(paths.filter((path) => path.startsWith(`${teamId}/`)))];
  const signed = await Promise.all(unique.map(async (path) => {
    const result = await db.storage.from("academy-private").createSignedUrl(path, 300);
    return [path, result.data?.signedUrl ?? ""] as const;
  }));
  return new Map(signed.filter((entry) => entry[1]));
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

function role(value: unknown): TeamRole {
  return value === "admin" || value === "editor" ? value : "member";
}
