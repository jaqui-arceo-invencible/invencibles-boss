/* eslint-disable @next/next/no-img-element -- Private signed cover URLs must not enter a shared optimizer cache. */
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { createModule, duplicateModule, moveContent } from "@/app/admin/content-actions";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton } from "@/components/design/buttons";
import { Card, CardContent } from "@/components/ui/card";
import { CoverPicker } from "@/components/features/cms/cover-picker";
import { AdminDialog } from "@/components/features/admin/admin-dialog";
export const instant=false;
export default async function AdminModulesPage({searchParams}:{searchParams:Promise<{error?:string;created?:string}>}) {
 const access=await requireAdminOrEditor();const db=await createClient();
 const [{data:modules},{data:images},params]=await Promise.all([db.from("modules").select("id,title,description,position,status,updated_at,cover_resource_id,lessons(id)").eq("team_id",access.teamId).order("position"),db.from("resources").select("id,title,storage_path,mime_type").eq("team_id",access.teamId).like("mime_type","image/%").limit(200),searchParams]);
 const coverIds=new Set((modules??[]).map(m=>m.cover_resource_id).filter(Boolean));
 const coverUrls=Object.fromEntries(await Promise.all((images??[]).filter(r=>coverIds.has(r.id)).map(async r=>[r.id,(await db.storage.from("academy-private").createSignedUrl(r.storage_path,300)).data?.signedUrl??""] as const)));
 return <main className="admin-page admin-modules"><PageHeader title="Módulos" backHref="/admin" /><div className="admin-list-heading"><p>Organiza los módulos y entra a cada uno para editar sus lecciones.</p><AdminDialog label="Crear módulo" title="Nuevo módulo" description="Añade los datos iniciales. Se guardará como borrador."><form action={createModule} className="cms-form"><label>Título<input name="title" required maxLength={160}/></label><label>Descripción<textarea name="description" maxLength={1000} rows={3}/></label><CoverPicker currentUrl={null} /><PrimaryButton type="submit">Crear borrador</PrimaryButton></form></AdminDialog></div>
 {params.error&&<p role="alert" className="auth-error">{params.error}</p>}{params.created&&<p role="status" className="inline-success">Módulo creado como borrador.</p>}
 {modules?.length?<div className="module-grid">{modules.map(m=><Card key={m.id}><CardContent className="module-card">{m.cover_resource_id&&coverUrls[m.cover_resource_id]?<img className="module-cover" src={coverUrls[m.cover_resource_id]} alt="" loading="lazy"/>:<div className="module-card-icon"><BookOpen size={21}/></div>}<span className="status-badge">{m.status==="draft"?"Borrador":m.status==="published"?"Publicado":"Archivado"}</span><span className="eyebrow">MÓDULO {String(m.position+1).padStart(2,"0")}</span><h2>{m.title}</h2><p>{m.description||"Sin descripción todavía."}</p><small>{m.lessons?.length??0} lecciones · Actualizado {new Date(m.updated_at).toLocaleDateString("es-MX")}</small><Link href={`/admin/modules/${m.id}`}>Administrar lecciones →</Link><div className="module-card-tools"><form action={duplicateModule}><input type="hidden" name="module_id" value={m.id}/><button className="icon-tool" type="submit" aria-label={`Duplicar ${m.title}`}><Copy size={20} aria-hidden="true" /></button></form><div className="order-actions">{[-1,1].map(direction=><form action={moveContent} key={direction}><input type="hidden" name="kind" value="module"/><input type="hidden" name="id" value={m.id}/><input type="hidden" name="direction" value={direction}/><button className="icon-tool" type="submit" aria-label={`${direction<0?"Subir":"Bajar"} ${m.title}`}>{direction<0?<ChevronUp size={20} aria-hidden="true"/>:<ChevronDown size={20} aria-hidden="true"/>}</button></form>)}</div></div></CardContent></Card>)}</div>:<Card><CardContent className="empty-state"><BookOpen size={30}/><h2>Aún no hay módulos</h2></CardContent></Card>}
 </main>;
}
