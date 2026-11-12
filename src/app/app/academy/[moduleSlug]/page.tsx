import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function AcademyModulePage({params}:{params:Promise<{moduleSlug:string}>}) {
 const access=await requireMember();const {moduleSlug}=await params;const db=await createClient();
 const {data:m}=await db.from("modules").select("id,title,description,slug,lessons(id,title,summary,slug,position,status)").eq("team_id",access.teamId).eq("slug",moduleSlug).eq("status","published").single();if(!m)notFound();
 const lessons=(m.lessons??[]).filter(l=>l.status==="published").sort((a,b)=>a.position-b.position);
 return <main className="admin-page"><Link href="/app/academy">← Academia</Link><span className="eyebrow">MÓDULO</span><h1>{m.title}</h1><p>{m.description}</p><ol className="lesson-list">{lessons.map((l,i)=><li key={l.id}><span className="lesson-number">{String(i+1).padStart(2,"0")}</span><div><strong>{l.title}</strong><small>{l.summary}</small></div><Link href={`/app/academy/${m.slug}/${l.slug}`}>Abrir →</Link></li>)}</ol></main>;
}
