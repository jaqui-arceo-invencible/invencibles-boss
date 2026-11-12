import "server-only";
import { connection } from "next/server";
import type { AccessContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  chooseContinueLesson,
  moduleProgress,
  WELCOME_MODULE_SLUG,
  type LessonStatus,
  type ModuleProgress,
  type ProgressRow,
  type StoredProgressStatus,
} from "@/lib/learning/progress";

export type LessonView = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  position: number;
  estimatedMinutes: number;
  status: LessonStatus;
  lastOpenedAt: string | null;
  completedAt: string | null;
};

export type ModuleView = {
  id: string;
  title: string;
  slug: string;
  description: string;
  position: number;
  coverUrl: string | null;
  lessons: LessonView[];
  progress: ModuleProgress;
};

export type LearningSnapshot = {
  joinedAt: string | null;
  teamName: string;
  withinWelcome: boolean;
  modules: ModuleView[];
  overall: ModuleProgress;
  hasStarted: boolean;
  continueHref: string | null;
  continueLessonTitle: string | null;
  continueModuleTitle: string | null;
  lastActivityAt: string | null;
  recentCompletions: { title: string; moduleTitle: string; href: string; completedAt: string }[];
};

type ProgressRecord = ProgressRow & { lastOpenedAt: string | null; completedAt: string | null };

export async function loadLearningSnapshot(access: AccessContext): Promise<LearningSnapshot> {
  await connection();
  const db = await createClient();
  const [modulesResult, progressResult, membershipResult, teamResult] = await Promise.all([
    db.from("modules").select("id,title,slug,description,position,cover_resource_id").eq("team_id", access.teamId).eq("status", "published").order("position"),
    db.from("lesson_progress").select("lesson_id,status,last_opened_at,completed_at").eq("user_id", access.userId).eq("team_id", access.teamId),
    db.from("memberships").select("joined_at").eq("user_id", access.userId).eq("team_id", access.teamId).eq("status", "active").maybeSingle(),
    db.from("teams").select("name").eq("id", access.teamId).maybeSingle(),
  ]);
  if (modulesResult.error || progressResult.error) throw new Error("No pudimos cargar tu aprendizaje.");

  const modules = moduleRows(modulesResult.data);
  const moduleIds = modules.map((module) => module.id);
  const lessonsResult = moduleIds.length
    ? await db.from("lessons").select("id,module_id,slug,position,status,published_revision_id").in("module_id", moduleIds).eq("status", "published").order("position")
    : { data: [], error: null };
  if (lessonsResult.error) throw new Error("No pudimos cargar las lecciones.");
  const lessons = lessonRows(lessonsResult.data).filter((lesson) => lesson.publishedRevisionId);
  const revisionIds = lessons.map((lesson) => lesson.publishedRevisionId);
  const revisionsResult = revisionIds.length
    ? await db.from("lesson_revisions").select("id,title,summary,estimated_minutes").in("id", revisionIds)
    : { data: [], error: null };
  if (revisionsResult.error) throw new Error("No pudimos cargar las lecciones publicadas.");
  const revisions = new Map(revisionRows(revisionsResult.data).map((revision) => [revision.id, revision]));
  const progress = progressRows(progressResult.data);
  const progressByLesson = new Map(progress.map((row) => [row.lessonId, row]));

  const coverIds = modules.flatMap((module) => module.coverResourceId ? [module.coverResourceId] : []);
  const coversResult = coverIds.length
    ? await db.from("resources").select("id,storage_path").eq("team_id", access.teamId).in("id", coverIds)
    : { data: [], error: null };
  const coverUrls = new Map<string, string>();
  if (!coversResult.error) {
    await Promise.all(resourceRows(coversResult.data).map(async (resource) => {
      const signed = await db.storage.from("academy-private").createSignedUrl(resource.storagePath, 300);
      if (signed.data?.signedUrl) coverUrls.set(resource.id, signed.data.signedUrl);
    }));
  }

  const moduleViews: ModuleView[] = modules.map((module) => {
    const moduleLessons = lessons
      .filter((lesson) => lesson.moduleId === module.id)
      .flatMap((lesson) => {
        const revision = revisions.get(lesson.publishedRevisionId);
        if (!revision) return [];
        const row = progressByLesson.get(lesson.id);
        return [{
          id: lesson.id,
          title: revision.title,
          slug: lesson.slug,
          summary: revision.summary,
          position: lesson.position,
          estimatedMinutes: revision.estimatedMinutes,
          status: row?.status ?? "not_started",
          lastOpenedAt: row?.lastOpenedAt ?? null,
          completedAt: row?.completedAt ?? null,
        } satisfies LessonView];
      })
      .sort((a, b) => a.position - b.position);
    return {
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.description,
      position: module.position,
      coverUrl: module.coverResourceId ? coverUrls.get(module.coverResourceId) ?? null : null,
      lessons: moduleLessons,
      progress: moduleProgress(moduleLessons.map((lesson) => lesson.id), progress),
    };
  });

  const publishedIds = moduleViews.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const overall = moduleProgress(publishedIds, progress);
  const joinedAt = stringOrNull(membershipResult.data?.joined_at);
  const welcomeResult = await db.rpc("membership_is_in_welcome_window", { target_team: access.teamId });
  const withinWelcome = welcomeResult.data === true;
  const next = chooseContinueLesson(moduleViews, withinWelcome, WELCOME_MODULE_SLUG);
  const activityTimes = progress.flatMap((row) => [row.lastOpenedAt, row.completedAt].filter((value): value is string => Boolean(value)));
  activityTimes.sort((a, b) => b.localeCompare(a));
  const recentCompletions = moduleViews.flatMap((module) => module.lessons.flatMap((lesson) => {
    if (lesson.status !== "completed" || !lesson.completedAt) return [];
    return [{ title: lesson.title, moduleTitle: module.title, href: `/app/academy/${module.slug}/${lesson.slug}`, completedAt: lesson.completedAt }];
  })).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 8);

  return {
    joinedAt,
    teamName: stringOrNull(teamResult.data?.name) ?? "Invencibles Boss",
    withinWelcome,
    modules: moduleViews,
    overall,
    hasStarted: progress.some((row) => publishedIds.includes(row.lessonId)),
    continueHref: next ? `/app/academy/${next.module.slug}/${next.lesson.slug}` : null,
    continueLessonTitle: next?.lesson.title ?? null,
    continueModuleTitle: next?.module.title ?? null,
    lastActivityAt: activityTimes[0] ?? null,
    recentCompletions,
  };
}

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  mimeType: string;
  kind: "image" | "document";
  storagePath: string;
  moduleSlug: string;
  moduleTitle: string;
  lessonTitle: string;
};

export async function loadPublishedResources(access: AccessContext) {
  await connection();
  const db = await createClient();
  const modulesResult = await db.from("modules").select("id,title,slug,cover_resource_id").eq("team_id", access.teamId).eq("status", "published").order("position");
  if (modulesResult.error) throw new Error("No pudimos cargar tus recursos.");
  const modules = moduleRows(modulesResult.data);
  const moduleIds = modules.map((module) => module.id);
  const lessonsResult = moduleIds.length
    ? await db.from("lessons").select("id,module_id,title,slug,status,published_revision_id").in("module_id", moduleIds).eq("status", "published")
    : { data: [], error: null };
  if (lessonsResult.error) throw new Error("No pudimos cargar tus recursos.");
  const lessons = lessonRows(lessonsResult.data).filter((lesson) => lesson.publishedRevisionId);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const revisionIds = lessons.map((lesson) => lesson.publishedRevisionId);
  const [linksResult, blocksResult] = await Promise.all([
    lessonIds.length ? db.from("lesson_resources").select("lesson_id,resource_id").in("lesson_id", lessonIds) : Promise.resolve({ data: [], error: null }),
    revisionIds.length ? db.from("content_blocks").select("revision_id,type,content").in("revision_id", revisionIds).in("type", ["image", "document"]) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linksResult.error || blocksResult.error) throw new Error("No pudimos cargar tus recursos.");

  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const lessonByRevision = new Map(lessons.map((lesson) => [lesson.publishedRevisionId, lesson]));
  const contexts = new Map<string, { moduleSlug: string; moduleTitle: string; lessonTitle: string }>();

  for (const link of linkRows(linksResult.data)) {
    const lesson = lessonById.get(link.lessonId);
    const learningModule = lesson ? moduleById.get(lesson.moduleId) : undefined;
    if (!lesson || !learningModule || contexts.has(link.resourceId)) continue;
    contexts.set(link.resourceId, { moduleSlug: learningModule.slug, moduleTitle: learningModule.title, lessonTitle: lesson.title });
  }
  for (const block of blockRows(blocksResult.data)) {
    if (!block.resourceId || contexts.has(block.resourceId)) continue;
    const lesson = lessonByRevision.get(block.revisionId);
    const learningModule = lesson ? moduleById.get(lesson.moduleId) : undefined;
    if (!lesson || !learningModule) continue;
    contexts.set(block.resourceId, { moduleSlug: learningModule.slug, moduleTitle: learningModule.title, lessonTitle: lesson.title });
  }
  for (const learningModule of modules) {
    if (!learningModule.coverResourceId || contexts.has(learningModule.coverResourceId)) continue;
    contexts.set(learningModule.coverResourceId, { moduleSlug: learningModule.slug, moduleTitle: learningModule.title, lessonTitle: "Portada del módulo" });
  }

  const ids = [...contexts.keys()];
  const resourcesResult = ids.length
    ? await db.from("resources").select("id,title,description,mime_type,storage_path").eq("team_id", access.teamId).in("id", ids)
    : { data: [], error: null };
  if (resourcesResult.error) throw new Error("No pudimos cargar tus recursos.");

  const items: ResourceItem[] = resourceDetailRows(resourcesResult.data).flatMap((resource) => {
    const context = contexts.get(resource.id);
    if (!context) return [];
    const kind = resource.mimeType === "application/pdf" ? "document" : "image";
    const item: ResourceItem = { ...resource, kind, ...context };
    return [item];
  }).sort((a, b) => a.title.localeCompare(b.title, "es"));

  return { modules: modules.map((module) => ({ slug: module.slug, title: module.title })), items };
}

export async function signResourceMap(teamId: string, rows: { id: string; storagePath: string }[]) {
  const db = await createClient();
  const urls = new Map<string, string>();
  await Promise.all(rows.map(async (row) => {
    if (!row.storagePath.startsWith(`${teamId}/`)) return;
    const signed = await db.storage.from("academy-private").createSignedUrl(row.storagePath, 300);
    if (signed.data?.signedUrl) urls.set(row.id, signed.data.signedUrl);
  }));
  return urls;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function moduleRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.slug !== "string") return [];
    return [{
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: typeof item.description === "string" ? item.description : "",
      position: typeof item.position === "number" ? item.position : 0,
      coverResourceId: typeof item.cover_resource_id === "string" ? item.cover_resource_id : null,
    }];
  });
}

function lessonRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.module_id !== "string" || typeof item.slug !== "string") return [];
    if (item.status !== "published" || typeof item.published_revision_id !== "string") return [];
    return [{
      id: item.id,
      moduleId: item.module_id,
      title: typeof item.title === "string" ? item.title : "",
      slug: item.slug,
      position: typeof item.position === "number" ? item.position : 0,
      publishedRevisionId: item.published_revision_id,
    }];
  });
}

function revisionRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.title !== "string") return [];
    return [{
      id: item.id,
      title: item.title,
      summary: typeof item.summary === "string" ? item.summary : "",
      estimatedMinutes: typeof item.estimated_minutes === "number" ? item.estimated_minutes : 5,
    }];
  });
}

function progressRows(value: unknown): ProgressRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.lesson_id !== "string" || (item.status !== "in_progress" && item.status !== "completed")) return [];
    return [{
      lessonId: item.lesson_id,
      status: item.status as StoredProgressStatus,
      lastOpenedAt: stringOrNull(item.last_opened_at),
      completedAt: stringOrNull(item.completed_at),
    }];
  });
}

function resourceRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.storage_path !== "string") return [];
    return [{ id: item.id, storagePath: item.storage_path }];
  });
}

function resourceDetailRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.mime_type !== "string" || typeof item.storage_path !== "string") return [];
    return [{
      id: item.id,
      title: item.title,
      description: typeof item.description === "string" ? item.description : "",
      mimeType: item.mime_type,
      storagePath: item.storage_path,
    }];
  });
}

function linkRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.lesson_id !== "string" || typeof item.resource_id !== "string") return [];
    return [{ lessonId: item.lesson_id, resourceId: item.resource_id }];
  });
}

function blockRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.revision_id !== "string") return [];
    const content = item.content;
    const resourceId = content && typeof content === "object" && "resourceId" in content && typeof content.resourceId === "string" ? content.resourceId : null;
    return [{ revisionId: item.revision_id, resourceId }];
  });
}
