"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export async function updateResourceMetadata(formData:FormData){
 const access=await requireAdminOrEditor();const id=String(formData.get("resource_id")??"");const title=String(formData.get("title")??"").trim().slice(0,180);const description=String(formData.get("description")??"").trim().slice(0,1000);
 if(!title)redirect("/admin/library?error=Escribe%20un%20nombre");
 const db=await createClient();const {error}=await db.from("resources").update({title,description,updated_at:new Date().toISOString()}).eq("id",id).eq("team_id",access.teamId);
 if(error)redirect("/admin/library?error=No%20se%20pudo%20guardar");
 revalidatePath("/admin/library");redirect("/admin/library?updated=1");
}
export async function deleteResource(formData:FormData){
 const access=await requireAdminOrEditor();const id=String(formData.get("resource_id")??"");
 if(!/^[0-9a-f-]{36}$/.test(id))redirect("/admin/library?error=Recurso%20no%20válido");
 const db=await createClient();
 const {data:resource}=await db.from("resources").select("id").eq("id",id).eq("team_id",access.teamId).single();
 if(!resource)redirect("/admin/library?error=Recurso%20no%20encontrado");
 const {data,error}=await db.rpc("delete_unused_resource",{target_id:id});
 if(error||!data?.[0])redirect(`/admin/library?error=${encodeURIComponent(error?.code==="23503"?"Este archivo está en uso y no se puede eliminar":"No se pudo eliminar el archivo")}`);
 const job=data[0];const admin=createAdminClient();
 const {error:storageError}=await admin.storage.from("academy-private").remove([job.object_path]);
 if(storageError)redirect("/admin/library?error=El%20archivo%20se%20retiró%20de%20la%20biblioteca%3B%20su%20limpieza%20quedó%20pendiente");
 await admin.from("resource_deletion_jobs").update({completed_at:new Date().toISOString()}).eq("id",job.job_id);
 revalidatePath("/admin/library");redirect("/admin/library?deleted=1");
}
