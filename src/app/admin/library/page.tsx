/* eslint-disable @next/next/no-img-element -- Private signed media should not be cached by a shared optimizer. */
import Link from "next/link";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { deleteResource, updateResourceMetadata } from "@/app/admin/library/actions";
import { DeleteResourceButton } from "@/components/features/cms/delete-resource-button";
import { PageHeader } from "@/components/design/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LibraryUploadButton } from "@/components/features/admin/library-upload-button";
export const instant=false;
export default async function LibraryPage({searchParams}:{searchParams:Promise<{error?:string;uploaded?:string;updated?:string;deleted?:string;view?:string;q?:string;type?:string;page?:string}>}){
 const access=await requireAdminOrEditor();const db=await createClient();const query=await searchParams;const page=Math.max(0,Number(query.page)||0);const view=query.view==="grid"?"grid":"list";
 let request=db.from("resources").select("id,title,description,file_name,mime_type,file_size,storage_path,created_at",{count:"exact"}).eq("team_id",access.teamId).order("created_at",{ascending:false}).range(page*20,page*20+19);
 if(query.q)request=request.ilike("title",`%${query.q.replace(/[%_]/g,"")}%`);if(query.type==="image")request=request.like("mime_type","image/%");if(query.type==="document")request=request.eq("mime_type","application/pdf");
 const {data:resources,count}=await request;
 const rows=await Promise.all((resources??[]).map(async r=>({...r,previewUrl:(await db.storage.from("academy-private").createSignedUrl(r.storage_path,300)).data?.signedUrl??""})));
 return <main className="admin-page"><PageHeader title="Biblioteca" backHref="/admin" /><p>Archivos privados del equipo.</p>
 {query.error&&<p role="alert" className="auth-error">{query.error}</p>}{(query.uploaded||query.updated||query.deleted)&&<p role="status" className="inline-success">Cambios guardados.</p>}
 <div className="admin-list-heading"><p>{count??0} archivos en la biblioteca</p><LibraryUploadButton /></div>
 <Card><CardContent className="admin-card-content"><h2>Explorar archivos</h2><form method="get" className="library-filters"><input aria-label="Buscar archivos" name="q" placeholder="Buscar por nombre" defaultValue={query.q??""}/><select aria-label="Tipo de archivo" name="type" defaultValue={query.type??"all"}><option value="all">Todos</option><option value="image">Imágenes</option><option value="document">PDF</option></select><select aria-label="Vista de archivos" name="view" defaultValue={view}><option value="list">Lista</option><option value="grid">Cuadrícula</option></select><Button type="submit">Filtrar</Button></form>
 {rows.length?<div className={view==="grid"?"resource-grid":"resource-list"}>{rows.map(r=><article className="resource-row" key={r.id}><div className="resource-thumb">{r.mime_type.startsWith("image/")&&r.previewUrl?<img src={r.previewUrl} alt="" loading="lazy"/>:<span>PDF</span>}</div><div className="resource-info"><strong>{r.title}</strong><small>{r.file_name} · {(r.file_size/1024/1024).toFixed(1)} MB</small><details><summary>Editar detalles</summary><form action={updateResourceMetadata} className="cms-form"><input type="hidden" name="resource_id" value={r.id}/><label>Nombre<input name="title" defaultValue={r.title} required/></label><label>Descripción<textarea name="description" defaultValue={r.description}/></label><Button type="submit">Guardar</Button></form></details><form action={deleteResource}><input type="hidden" name="resource_id" value={r.id}/><DeleteResourceButton title={r.title}/></form></div>{r.previewUrl&&<a href={r.previewUrl} target="_blank" rel="noreferrer">Ver ↗</a>}</article>)}</div>:<p>Aún no hay archivos con estos filtros.</p>}
 <nav className="library-pages" aria-label="Páginas de recursos">{page>0&&<Link href={`/admin/library?page=${page-1}&view=${view}`}>← Anterior</Link>}{(count??0)>(page+1)*20&&<Link href={`/admin/library?page=${page+1}&view=${view}`}>Siguiente →</Link>}</nav></CardContent></Card></main>;
}
