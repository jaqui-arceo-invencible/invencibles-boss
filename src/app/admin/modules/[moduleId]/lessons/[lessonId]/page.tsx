import { LessonCommentsToggle } from "@/components/features/cms/lesson-comments-toggle";
import { LessonEditorClient } from "@/components/features/cms/lesson-editor-client";
import type { BlockInput } from "@/lib/content/blocks";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export const instant = false;

export default async function LessonEditorPage({ params, searchParams }: {
  params: Promise<{ moduleId: string; lessonId: string }>;
  searchParams: Promise<{ saved?: string; published?: string; error?: string }>;
}) {
  const access = await requireAdminOrEditor();
  const { moduleId, lessonId } = await params;
  const flash = await searchParams;
  const db = await createClient();
  const { data: course } = await db.from("modules").select("title").eq("id", moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("id,title,summary,estimated_minutes,status,working_revision_id,published_revision_id,comments_enabled").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!course || !lesson) return <main className="admin-page"><h1>No encontramos la lección</h1></main>;

  const [revisionResult, blocksResult, resourcesResult, linksResult] = await Promise.all([
    lesson.working_revision_id
      ? db.from("lesson_revisions").select("title,summary,estimated_minutes,lesson_format,video_url,cover_resource_id").eq("id", lesson.working_revision_id).single()
      : Promise.resolve({ data: null }),
    lesson.working_revision_id
      ? db.from("content_blocks").select("type,content,position").eq("revision_id", lesson.working_revision_id).order("position")
      : Promise.resolve({ data: [] }),
    db.from("resources").select("id,title,mime_type,file_name,storage_path").eq("team_id", access.teamId).order("title").limit(200),
    db.from("lesson_resources").select("resource_id,position").eq("lesson_id", lessonId).order("position"),
  ]);
  const blocks = (blocksResult.data ?? []).map((block, index) => ({
    type: block.type,
    content: block.content,
    position: index,
  })) as BlockInput[];
  const lessonFormat = revisionResult.data?.lesson_format === "video" ? "video" : "text";
  const coverId = revisionResult.data?.cover_resource_id;
  const linkedIds = (linksResult.data ?? []).flatMap((link) => typeof link.resource_id === "string" ? [link.resource_id] : []);
  let coverUrl: string | null = null;
  if (coverId) {
    const { data: cover } = await db.from("resources").select("storage_path").eq("id", coverId).eq("team_id", access.teamId).maybeSingle();
    if (cover?.storage_path) {
      const signed = await db.storage.from("academy-private").createSignedUrl(cover.storage_path, 300);
      coverUrl = signed.data?.signedUrl ?? null;
    }
  }

  const resourceRows = resourcesResult.data ?? [];
  const signedResources = resourceRows.length ? await db.storage.from("academy-private").createSignedUrls(resourceRows.map((resource) => resource.storage_path), 300) : null;
  const urlByPath = new Map((signedResources?.data ?? []).map((item) => [item.path, item.signedUrl]));
  return <LessonEditorClient
    key={lessonId}
    moduleId={moduleId}
    lessonId={lessonId}
    moduleTitle={course.title}
    lessonTitle={lesson.title}
    lessonStatus={lesson.status}
    canPublish={access.role === "admin"}
    title={revisionResult.data?.title ?? lesson.title}
    summary={revisionResult.data?.summary ?? lesson.summary}
    minutes={revisionResult.data?.estimated_minutes ?? lesson.estimated_minutes}
    lessonFormat={lessonFormat}
    videoUrl={revisionResult.data?.video_url ?? ""}
    coverUrl={coverUrl}
    coverResourceId={coverId ?? null}
    blocks={blocks}
    resources={resourceRows.map((resource) => ({ id: resource.id, title: resource.title, mime_type: resource.mime_type, previewUrl: urlByPath.get(resource.storage_path) ?? undefined }))}
    downloadableResources={(resourcesResult.data ?? []).map((resource) => ({
      id: resource.id,
      title: resource.title,
      fileName: resource.file_name,
      mimeType: resource.mime_type,
    }))}
    downloadResourceIds={linkedIds}
    flash={flash}
  >
    {access.role === "admin" ? <LessonCommentsToggle moduleId={moduleId} lessonId={lessonId} enabled={lesson.comments_enabled !== false} /> : null}
  </LessonEditorClient>;
}
