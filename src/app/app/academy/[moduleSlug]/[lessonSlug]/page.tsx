import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ContentRenderer } from "@/components/features/cms/content-renderer";
import type { BlockType } from "@/lib/content/blocks";
export const instant=false;
export default async function AcademyLessonPage({params}:{params:Promise<{moduleSlug:string;lessonSlug:string}>}) {
 const access=await requireMember();const {moduleSlug,lessonSlug}=await params;const db=await createClient();
 const {data:m}=await db.from("modules").select("id,title,slug").eq("team_id",access.teamId).eq("slug",moduleSlug).eq("status","published").single();if(!m)notFound();
 const {data:l}=await db.from("lessons").select("id,title,published_revision_id,slug").eq("module_id",m.id).eq("slug",lessonSlug).eq("status","published").single();if(!l?.published_revision_id)notFound();
 const [{data:revision},{data:rawBlocks}]=await Promise.all([db.from("lesson_revisions").select("title,summary,estimated_minutes").eq("id",l.published_revision_id).single(),db.from("content_blocks").select("id,type,content,position").eq("revision_id",l.published_revision_id).order("position")]);
 const blocks=(rawBlocks??[]) as {id:string;type:BlockType;content:Record<string,string>}[];
 const ids=[...new Set(blocks.filter(b=>b.type==="image"||b.type==="document").map(b=>b.content.resourceId).filter(Boolean))];
 const {data:resources}=ids.length?await db.from("resources").select("id,storage_path").eq("team_id",access.teamId).in("id",ids):{data:[]};
 const pairs=await Promise.all((resources??[]).map(async r=>[r.id,(await db.storage.from("academy-private").createSignedUrl(r.storage_path,300)).data?.signedUrl??""] as const));
 return <main className="admin-page lesson-view"><Link href={`/app/academy/${m.slug}`}>← {m.title}</Link><span className="eyebrow">{revision?.estimated_minutes} MIN DE LECTURA</span><h1>{revision?.title}</h1><p>{revision?.summary}</p><ContentRenderer blocks={blocks} resourceUrls={Object.fromEntries(pairs)}/></main>;
}
