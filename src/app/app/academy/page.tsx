import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function AcademyPage() {
  const access = await requireMember(); const db = await createClient();
  const { data: modules } = await db.from("modules").select("id,title,slug,description,position,lessons(id)").eq("team_id", access.teamId).eq("status","published").order("position");
  return <main className="admin-page"><span className="eyebrow">ACADEMIA</span><h1>Tu academia</h1><p>Contenido para avanzar a tu ritmo.</p><div className="module-grid">{(modules ?? []).map((m)=><article className="module-card card" key={m.id}><span className="eyebrow">MÓDULO {String(m.position+1).padStart(2,"0")}</span><h2>{m.title}</h2><p>{m.description}</p><small>{m.lessons?.length ?? 0} lecciones</small><Link href={`/app/academy/${m.slug}`}>Ver módulo →</Link></article>)}</div>{!modules?.length&&<p>Aún no hay módulos publicados.</p>}</main>;
}
