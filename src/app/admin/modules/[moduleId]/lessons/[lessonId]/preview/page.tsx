/* eslint-disable @next/next/no-img-element -- Private signed cover URLs must not enter a shared optimizer cache. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ContentRenderer } from "@/components/features/cms/content-renderer";
import type { BlockType } from "@/lib/content/blocks";
export const instant=false;
export default async function DraftPreviewPage({params}:{params:Promise<{moduleId:string;lessonId:string}>}) {
 const access=await requireAdminOrEditor();const {moduleId,lessonId}=await params;const db=await createClient();
 const {data:module}=await db.from("modules").select("id,title").eq("id",moduleId).eq("team_id",access.teamId).single();
 const {data:lesson}=await db.from("lessons").select("working_revision_id").eq("id",lessonId).eq("module_id",moduleId).single();
 if(!module||!lesson?.working_revision_id)notFound();
 const [{data:revision},{data:rawBlocks}]=await Promise.all([db.from("lesson_revisions").select("title,summary,estimated_minutes,lesson_format,video_url,cover_resource_id").eq("id",lesson.working_revision_id).single(),db.from("content_blocks").select("id,type,content,position").eq("revision_id",lesson.working_revision_id).order("position")]);
 const blocks=(rawBlocks??[]) as {id:string;type:BlockType;content:Record<string,string>}[];
 const ids=[...new Set([...blocks.filter(b=>b.type==="image"||b.type==="document").map(b=>b.content.resourceId).filter(Boolean),...(revision?.cover_resource_id?[revision.cover_resource_id]:[])])];
 const {data:resources}=ids.length?await db.from("resources").select("id,storage_path").eq("team_id",access.teamId).in("id",ids):{data:[]};
 const pairs=await Promise.all((resources??[]).map(async r=>[r.id,(await db.storage.from("academy-private").createSignedUrl(r.storage_path,300)).data?.signedUrl??""] as const));
 const resourceUrls=Object.fromEntries(pairs);
 const lessonBlocks=revision?.lesson_format==="video"?[{id:`video-${lessonId}`,type:"video" as const,content:{url:revision.video_url}}]:blocks;
 return <main className="admin-page lesson-view"><Link href={`/admin/modules/${moduleId}/lessons/${lessonId}`}>← Volver al editor</Link><span className="eyebrow">VISTA PREVIA PRIVADA · {module.title}</span><h1>{revision?.title}</h1><p>{revision?.summary}</p>{revision?.cover_resource_id&&resourceUrls[revision.cover_resource_id]?<img className="lesson-cover" src={resourceUrls[revision.cover_resource_id]} alt=""/>:null}<ContentRenderer blocks={lessonBlocks} resourceUrls={resourceUrls}/></main>;
}
