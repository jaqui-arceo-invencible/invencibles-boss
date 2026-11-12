import { LessonEditorClient } from "@/components/features/cms/lesson-editor-client";
import type { BlockInput } from "@/lib/content/blocks";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function LessonEditorPage({params,searchParams}:{params:Promise<{moduleId:string;lessonId:string}>;searchParams:Promise<{saved?:string;published?:string;error?:string}>}) {
 const access=await requireAdminOrEditor();const {moduleId,lessonId}=await params;const flash=await searchParams;const db=await createClient();
 const {data:module}=await db.from("modules").select("title").eq("id",moduleId).eq("team_id",access.teamId).single();
 const {data:lesson}=await db.from("lessons").select("id,title,summary,estimated_minutes,status,working_revision_id,published_revision_id").eq("id",lessonId).eq("module_id",moduleId).single();
 if(!module||!lesson)return <main className="admin-page"><h1>No encontramos la lección</h1></main>;
 const [revisionResult,blocksResult,resourcesResult]=await Promise.all([
  lesson.working_revision_id?db.from("lesson_revisions").select("title,summary,estimated_minutes").eq("id",lesson.working_revision_id).single():Promise.resolve({data:null}),
  lesson.working_revision_id?db.from("content_blocks").select("type,content,position").eq("revision_id",lesson.working_revision_id).order("position"):Promise.resolve({data:[]}),
  db.from("resources").select("id,title,mime_type").eq("team_id",access.teamId).order("title").limit(200)
 ]);
 const blocks=(blocksResult.data??[]).map((b,i)=>({type:b.type,content:b.content,position:i})) as BlockInput[];
 return <LessonEditorClient moduleId={moduleId} lessonId={lessonId} moduleTitle={module.title} lessonTitle={lesson.title} lessonStatus={lesson.status} canPublish={access.role==="admin"} title={revisionResult.data?.title??lesson.title} summary={revisionResult.data?.summary??lesson.summary} minutes={revisionResult.data?.estimated_minutes??lesson.estimated_minutes} blocks={blocks} resources={resourcesResult.data??[]} flash={flash}/>;
}
