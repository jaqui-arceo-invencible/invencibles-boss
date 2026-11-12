import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/design/page-header";
import { ContentRenderer } from "@/components/features/cms/content-renderer";
import { CompleteLessonButton, RecordLessonOpen } from "@/components/features/learning/lesson-progress-controls";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import type { BlockType } from "@/lib/content/blocks";
import { lessonStatusLabel } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const blockTypes = new Set<BlockType>(["rich_text", "image", "video", "document", "checklist", "divider", "callout"]);

export default async function AcademyLessonPage({ params }: { params: Promise<{ moduleSlug: string; lessonSlug: string }> }) {
  const access = await requireMember();
  const { moduleSlug, lessonSlug } = await params;
  const learning = await loadLearningSnapshot(access);
  const course = learning.modules.find((item) => item.slug === moduleSlug);
  const index = course?.lessons.findIndex((lesson) => lesson.slug === lessonSlug) ?? -1;
  if (!course || index < 0) notFound();
  const lesson = course.lessons[index];
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  const db = await createClient();
  const { data: row } = await db.from("lessons").select("published_revision_id").eq("id", lesson.id).eq("status", "published").maybeSingle();
  if (!row?.published_revision_id) notFound();
  const [{ data: rawBlocks }, { data: checks }] = await Promise.all([
    db.from("content_blocks").select("id,type,content,position").eq("revision_id", row.published_revision_id).order("position"),
    db.from("checklist_item_progress").select("item_id,completed").eq("user_id", access.userId).eq("lesson_id", lesson.id).eq("completed", true),
  ]);
  const blocks = blockRows(rawBlocks);
  const resourceIds = [...new Set(blocks.flatMap((block) => block.type === "image" || block.type === "document" ? [block.content.resourceId].filter(Boolean) : []))];
  const resources = resourceIds.length ? await db.from("resources").select("id,storage_path").eq("team_id", access.teamId).in("id", resourceIds) : { data: [] };
  const pairs = await Promise.all((resources.data ?? []).flatMap((resource) => {
    if (!resource || typeof resource.storage_path !== "string" || typeof resource.id !== "string") return [];
    return [sign(resource.id, resource.storage_path, db)];
  }));
  const completedItemIds = Array.isArray(checks) ? checks.flatMap((item) => typeof item.item_id === "string" ? [item.item_id] : []) : [];

  return <main className="admin-page lesson-view">
    <RecordLessonOpen lessonId={lesson.id} moduleSlug={course.slug} />
    <PageHeader title={lesson.title} backHref={`/app/academy/${course.slug}`} />
    <p className="lesson-meta">{course.title} · Lección {index + 1} de {course.lessons.length} · {lesson.estimatedMinutes} min · {lessonStatusLabel(lesson.status)}</p>
    {lesson.summary ? <p className="ds-lead">{lesson.summary}</p> : null}
    <ContentRenderer blocks={blocks} resourceUrls={Object.fromEntries(await Promise.all(pairs))} lessonId={lesson.id} completedItemIds={completedItemIds} />
    <CompleteLessonButton lessonId={lesson.id} completed={lesson.status === "completed"} nextHref={next ? `/app/academy/${course.slug}/${next.slug}` : null} />
    <nav className="lesson-pager" aria-label="Lecciones del módulo">
      {previous ? <Link href={`/app/academy/${course.slug}/${previous.slug}`}>Lección anterior</Link> : <span />}
      <Link href={`/app/academy/${course.slug}`}>Volver al módulo</Link>
      {next ? <Link href={`/app/academy/${course.slug}/${next.slug}`}>Lección siguiente</Link> : <span />}
    </nav>
  </main>;
}

async function sign(id: string, path: string, db: Awaited<ReturnType<typeof createClient>>) {
  const signed = await db.storage.from("academy-private").createSignedUrl(path, 300);
  return [id, signed.data?.signedUrl ?? ""] as const;
}

function blockRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.type !== "string" || !blockTypes.has(item.type as BlockType)) return [];
    return [{ id: item.id, type: item.type as BlockType, content: stringContent(item.content) }];
  });
}

function stringContent(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const content: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") content[key] = item;
  }
  return content;
}
