import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Download, List } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { ContentRenderer } from "@/components/features/cms/content-renderer";
import { CommentThread } from "@/components/features/community/comment-thread";
import { CompleteLessonButton, RecordLessonOpen } from "@/components/features/learning/lesson-progress-controls";
import { requireMember } from "@/lib/auth/guards";
import { loadLessonThread } from "@/lib/community/feed";
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
  const [{ data: revision }, { data: rawBlocks }, { data: checks }, { data: downloadLinks }] = await Promise.all([
    db.from("lesson_revisions").select("lesson_format,video_url").eq("id", row.published_revision_id).single(),
    db.from("content_blocks").select("id,type,content,position").eq("revision_id", row.published_revision_id).order("position"),
    db.from("checklist_item_progress").select("item_id,completed").eq("user_id", access.userId).eq("lesson_id", lesson.id).eq("completed", true),
    db.from("lesson_resources").select("resource_id,position").eq("lesson_id", lesson.id).order("position"),
  ]);
  const blocks = blockRows(rawBlocks);
  const downloadIds = (downloadLinks ?? []).flatMap((link) => typeof link.resource_id === "string" ? [link.resource_id] : []);
  const resourceIds = [...new Set([
    ...blocks.flatMap((block) => block.type === "image" || block.type === "document" ? [block.content.resourceId].filter(Boolean) : []),
    ...downloadIds,
  ])];
  const resources = resourceIds.length ? await db.from("resources").select("id,title,storage_path").eq("team_id", access.teamId).in("id", resourceIds) : { data: [] };
  const pairs = await Promise.all((resources.data ?? []).flatMap((resource) => {
    if (!resource || typeof resource.storage_path !== "string" || typeof resource.id !== "string") return [];
    return [sign(resource.id, resource.storage_path, db)];
  }));
  const resourceUrls = Object.fromEntries(await Promise.all(pairs));
  const resourceById = new Map((resources.data ?? []).map((resource) => [resource.id, resource]));
  const downloads = downloadIds.flatMap((id) => {
    const resource = resourceById.get(id);
    const url = resourceUrls[id];
    return resource && url ? [{ id, title: resource.title, url }] : [];
  });
  const lessonBlocks = revision?.lesson_format === "video"
    ? [{ id: `video-${lesson.id}`, type: "video" as const, content: { url: revision.video_url } }]
    : blocks;
  const isVideoLesson = revision?.lesson_format === "video";
  const completedItemIds = Array.isArray(checks) ? checks.flatMap((item) => typeof item.item_id === "string" ? [item.item_id] : []) : [];
  const thread = await loadLessonThread(access, lesson.id);

  return <main className="admin-page lesson-view">
    <RecordLessonOpen lessonId={lesson.id} moduleSlug={course.slug} />
    <PageHeader backHref={`/app/academy/${course.slug}`} />
    <div className="lesson-toolbar">
      <details className="lesson-index">
        <summary><List size={18} aria-hidden="true" /> Lección {index + 1} de {course.lessons.length}</summary>
        <nav aria-label="Contenido del módulo"><strong>{course.title}</strong>{course.lessons.map((item, position) => <Link key={item.id} href={`/app/academy/${course.slug}/${item.slug}`} aria-current={item.id === lesson.id ? "page" : undefined}><span>{String(position + 1).padStart(2, "0")}</span><span>{item.title}</span>{item.status === "completed" ? <Check size={16} aria-label="Completada" /> : null}</Link>)}</nav>
      </details>
      <CompleteLessonButton key={lesson.id} lessonId={lesson.id} completed={lesson.status === "completed"} />
      <nav className="lesson-pager" aria-label="Lecciones del módulo">
        {previous ? <Link href={`/app/academy/${course.slug}/${previous.slug}`}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Link> : null}
        {next ? <Link href={`/app/academy/${course.slug}/${next.slug}`}>Siguiente <ArrowRight size={16} aria-hidden="true" /></Link> : null}
      </nav>
    </div>
    {isVideoLesson ? <ContentRenderer blocks={lessonBlocks} resourceUrls={resourceUrls} lessonId={lesson.id} completedItemIds={completedItemIds} /> : null}
    <header className="lesson-heading">
      <h1>{lesson.title}</h1>
      {lesson.summary ? <p>{lesson.summary}</p> : null}
    </header>
    <p className="lesson-meta">{course.title} · Lección {index + 1} de {course.lessons.length} · {lesson.estimatedMinutes} min · {lessonStatusLabel(lesson.status)}</p>
    {!isVideoLesson ? <ContentRenderer blocks={lessonBlocks} resourceUrls={resourceUrls} lessonId={lesson.id} completedItemIds={completedItemIds} /> : null}
    {downloads.length ? <section className="lesson-downloads" aria-labelledby="resources-title">
      <div className="lesson-downloads-heading">
        <div><h2 id="resources-title">Archivos descargables</h2><p>Materiales complementarios de esta lección.</p></div>
        <span>{downloads.length}</span>
      </div>
      <ul>{downloads.map((resource) => <li key={resource.id}><a href={resource.url} target="_blank" rel="noreferrer"><span><Download size={20} aria-hidden="true" /></span><strong>{resource.title}</strong><span className="lesson-download-action">Descargar</span></a></li>)}</ul>
    </section> : null}
    <Link className="lesson-back-to-module" href={`/app/academy/${course.slug}`}>Volver al módulo</Link>
    <CommentThread key={lesson.id} title="Preguntas y comentarios" comments={thread.comments} currentUserId={access.userId} isAdmin={access.role === "admin"} canComment={thread.open} lessonId={lesson.id} closedMessage="La administradora cerró los comentarios de esta lección." />
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
