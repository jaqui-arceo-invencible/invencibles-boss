"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBlocks } from "@/lib/content/blocks";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function createModule(formData: FormData) {
  const access = await requireAdminOrEditor();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  if (!title || !access.teamId) redirect("/admin/modules?error=Escribe%20un%20título");
  const supabase = await createClient();
  const coverId=String(formData.get("cover_resource_id")??"");
  if(coverId){const {data:cover}=await supabase.from("resources").select("id").eq("id",coverId).eq("team_id",access.teamId).like("mime_type","image/%").single();if(!cover)redirect("/admin/modules?error=Portada%20no%20válida");}
  const { count } = await supabase.from("modules").select("id", { count: "exact", head: true }).eq("team_id", access.teamId);
  const slug = slugify(title);
  const { error } = await supabase.from("modules").insert({ team_id: access.teamId, title, slug, description, cover_resource_id:coverId||null, position: count ?? 0, created_by: access.userId, status: "draft" });
  if (error) redirect(`/admin/modules?error=${encodeURIComponent(error.code === "23505" ? "Ya existe un módulo con ese título" : "No se pudo crear el módulo")}`);
  revalidatePath("/admin/modules");
  redirect("/admin/modules?created=1");
}

export async function createLesson(formData: FormData) {
  const access = await requireAdminOrEditor();
  const moduleId = String(formData.get("module_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  if (!module || !title) redirect(`/admin/modules/${moduleId}?error=Revisa%20el%20título`);
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data: lesson, error } = await supabase.from("lessons").insert({ module_id: moduleId, title, slug: slugify(title), position: count ?? 0, created_by: access.userId, status: "draft" }).select("id").single();
  if (error || !lesson) redirect(`/admin/modules/${moduleId}?error=${encodeURIComponent("No se pudo crear la lección")}`);
  const { data: revision, error: revisionError } = await supabase.from("lesson_revisions").insert({ lesson_id: lesson.id, revision: 1, title, created_by: access.userId }).select("id").single();
  if (revisionError || !revision) {
    await createAdminClient().from("lessons").delete().eq("id", lesson.id);
    redirect(`/admin/modules/${moduleId}?error=${encodeURIComponent("No se pudo iniciar el borrador")}`);
  }
  const { error: pointerError } = await supabase.from("lessons").update({ working_revision_id: revision.id }).eq("id", lesson.id);
  if (pointerError) {
    await createAdminClient().from("lessons").delete().eq("id", lesson.id);
    redirect(`/admin/modules/${moduleId}?error=${encodeURIComponent("No se pudo iniciar el borrador")}`);
  }
  revalidatePath(`/admin/modules/${moduleId}`);
  redirect(`/admin/modules/${moduleId}/lessons/${lesson.id}`);
}

export async function persistLessonDraft(input: {
  moduleId: string;
  lessonId: string;
  title: string;
  summary: string;
  minutes: number;
  blocksJson: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await requireAdminOrEditor();
  const moduleId = input.moduleId;
  const lessonId = input.lessonId;
  if (!/^[0-9a-f-]{36}$/i.test(moduleId) || !/^[0-9a-f-]{36}$/i.test(lessonId)) return { ok: false, message: "No encontramos la lección." };
  const title = input.title.trim().slice(0, 160);
  const summary = input.summary.trim().slice(0, 1000);
  const minutes = Math.max(1, Math.min(1440, Number(input.minutes) || 5));
  if (!title) return { ok: false, message: "Escribe un título antes de guardar." };
  const supabase = await createClient();
  let blocks;
  try { blocks = parseBlocks(input.blocksJson); } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Revisa los bloques." };
  }
  for (const block of blocks) if (block.type === "image" || block.type === "document") {
    const { data: resource } = await supabase.from("resources").select("id").eq("id", block.content.resourceId).eq("team_id", access.teamId).single();
    if (!resource) return { ok: false, message: "Hay un archivo que ya no pertenece a tu equipo." };
  }
  const { data: lesson } = await supabase.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!lesson) return { ok: false, message: "No encontramos la lección." };
  const { error } = await supabase.rpc("save_lesson_draft", { target_id: lessonId, new_title: title, new_summary: summary, new_minutes: minutes, new_blocks: blocks });
  if (error) return { ok: false, message: "No se pudo guardar. Tus cambios siguen en esta página." };
  revalidatePath(`/admin/modules/${moduleId}/lessons/${lessonId}`);
  revalidatePath("/app/academy");
  return { ok: true };
}

export async function saveLesson(formData: FormData) {
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const result = await persistLessonDraft({
    moduleId,
    lessonId,
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    minutes: Number(formData.get("estimated_minutes")),
    blocksJson: String(formData.get("blocks_json") ?? "[]"),
  });
  if (!result.ok) redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?error=${encodeURIComponent(result.message)}`);
  redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?saved=1`);
}

export async function publishLesson(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!lesson) redirect(`/admin/modules/${moduleId}`);
  const { error } = await supabase.rpc("publish_lesson", { target_id: lessonId });
  if (error) redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?error=No%20se%20pudo%20publicar`);
  revalidatePath("/app/academy");
  revalidatePath(`/app/academy/${moduleId}`);
  revalidatePath(`/admin/modules/${moduleId}/lessons/${lessonId}`);
  redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?published=1`);
}

export async function updateModule(formData: FormData) {
  const access = await requireAdminOrEditor();
  const id = String(formData.get("module_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0,160);
  const description = String(formData.get("description") ?? "").trim().slice(0,1000);
  if (!title) redirect(`/admin/modules/${id}?error=Escribe%20un%20título`);
  const db = await createClient();
  const coverId=String(formData.get("cover_resource_id")??"");
  if(coverId){const {data:cover}=await db.from("resources").select("id").eq("id",coverId).eq("team_id",access.teamId).like("mime_type","image/%").single();if(!cover)redirect(`/admin/modules/${id}?error=Portada%20no%20válida`);}
  const { error } = await db.from("modules").update({ title, description, cover_resource_id:coverId||null }).eq("id",id).eq("team_id",access.teamId);
  if (error) redirect(`/admin/modules/${id}?error=No%20se%20pudo%20guardar`);
  revalidatePath(`/admin/modules/${id}`); revalidatePath("/admin/modules");
  redirect(`/admin/modules/${id}?saved=1`);
}

export async function changeModuleStatus(formData: FormData) {
  const access = await requireAdmin();
  const id = String(formData.get("module_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft","published","archived"].includes(status)) redirect("/admin/modules");
  const db = await createClient();
  const { error } = await db.from("modules").update({ status, published_at: status==="published"?new Date().toISOString():null }).eq("id",id).eq("team_id",access.teamId);
  if (error) redirect(`/admin/modules/${id}?error=No%20se%20pudo%20cambiar%20el%20estado`);
  revalidatePath("/app/academy"); revalidatePath("/admin/modules");
  redirect(`/admin/modules/${id}?saved=1`);
}

export async function moveContent(formData: FormData) {
  await requireAdminOrEditor();
  const kind=String(formData.get("kind")??"");
  const id=String(formData.get("id")??"");
  const direction=Number(formData.get("direction"));
  const moduleId=String(formData.get("module_id")??"");
  if (!/^[0-9a-f-]{36}$/.test(id) || ![-1,1].includes(direction)) redirect("/admin/modules");
  const db=await createClient();
  const { error }=await db.rpc(kind==="module"?"move_module":"move_lesson",{target_id:id,direction});
  const path=kind==="module"?"/admin/modules":`/admin/modules/${moduleId}`;
  if(error) redirect(`${path}?error=No%20se%20pudo%20ordenar`);
  revalidatePath(path);
  redirect(path);
}

export async function duplicateModule(formData: FormData) {
  const access=await requireAdminOrEditor();
  const sourceId=String(formData.get("module_id")??"");
  const db=await createClient();
  const {data:source}=await db.from("modules").select("id,title,slug,description,cover_resource_id").eq("id",sourceId).eq("team_id",access.teamId).single();
  if(!source)redirect("/admin/modules?error=Módulo%20no%20encontrado");
  const {count}=await db.from("modules").select("id",{count:"exact",head:true}).eq("team_id",access.teamId);
  const {data:copy,error}=await db.from("modules").insert({team_id:access.teamId,title:`${source.title.slice(0,148)} (copia)`,slug:`${source.slug.slice(0,65)}-copia-${crypto.randomUUID().slice(0,8)}`,description:source.description,cover_resource_id:source.cover_resource_id,position:count??0,status:"draft",created_by:access.userId}).select("id").single();
  if(error||!copy)redirect("/admin/modules?error=No%20se%20pudo%20duplicar");
  let failed=false;
  const {data:lessons,error:listError}=await db.from("lessons").select("id,title,slug,summary,estimated_minutes,position,working_revision_id,published_revision_id").eq("module_id",sourceId).order("position");
  if(listError)failed=true;
  for(const lesson of lessons??[]){
    if(failed)break;
    const {data:newLesson,error:lessonError}=await db.from("lessons").insert({module_id:copy.id,title:lesson.title,slug:lesson.slug,summary:lesson.summary,estimated_minutes:lesson.estimated_minutes,position:lesson.position,status:"draft",created_by:access.userId}).select("id").single();
    if(lessonError||!newLesson){failed=true;break;}
    const revisionId=lesson.working_revision_id??lesson.published_revision_id;
    const {data:oldRevision}=revisionId?await db.from("lesson_revisions").select("title,summary,estimated_minutes").eq("id",revisionId).single():{data:null};
    const {data:newRevision,error:revisionError}=await db.from("lesson_revisions").insert({lesson_id:newLesson.id,revision:1,title:oldRevision?.title??lesson.title,summary:oldRevision?.summary??lesson.summary,estimated_minutes:oldRevision?.estimated_minutes??lesson.estimated_minutes,created_by:access.userId}).select("id").single();
    if(revisionError||!newRevision){failed=true;break;}
    const {data:blocks,error:blocksError}=revisionId?await db.from("content_blocks").select("type,content,position").eq("revision_id",revisionId).order("position"):{data:[],error:null};
    if(blocksError){failed=true;break;}
    if(blocks?.length){const {error:insertError}=await db.from("content_blocks").insert(blocks.map(block=>({...block,revision_id:newRevision.id})));if(insertError){failed=true;break;}}
    const {error:pointerError}=await db.from("lessons").update({working_revision_id:newRevision.id}).eq("id",newLesson.id);
    if(pointerError){failed=true;break;}
  }
  if(failed){await createAdminClient().from("modules").delete().eq("id",copy.id);redirect("/admin/modules?error=No%20se%20pudo%20completar%20la%20copia");}
  revalidatePath("/admin/modules");redirect(`/admin/modules/${copy.id}`);
}

export async function duplicateLesson(formData: FormData) {
  const access = await requireAdminOrEditor();
  const moduleId = String(formData.get("module_id") ?? "");
  const sourceId = String(formData.get("lesson_id") ?? "");
  const db = await createClient();
  const { data: module } = await db.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  const { data: source } = await db.from("lessons").select("id,title,slug,summary,estimated_minutes,working_revision_id,published_revision_id").eq("id", sourceId).eq("module_id", moduleId).single();
  if (!module || !source) redirect(`/admin/modules/${moduleId}?error=Lección%20no%20encontrada`);
  const revisionId = source.working_revision_id ?? source.published_revision_id;
  const [{ count }, revisionResult, blocksResult] = await Promise.all([
    db.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId),
    revisionId ? db.from("lesson_revisions").select("title,summary,estimated_minutes").eq("id", revisionId).single() : Promise.resolve({ data: null, error: null }),
    revisionId ? db.from("content_blocks").select("type,content,position").eq("revision_id", revisionId).order("position") : Promise.resolve({ data: [], error: null }),
  ]);
  if (revisionResult.error || blocksResult.error) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20leer%20la%20lección`);
  const copyTitle = `${source.title.slice(0, 148)} (copia)`;
  const { data: copy, error } = await db.from("lessons").insert({ module_id: moduleId, title: copyTitle, slug: `${source.slug.slice(0, 65)}-copia-${crypto.randomUUID().slice(0, 8)}`, summary: source.summary, estimated_minutes: source.estimated_minutes, position: count ?? 0, status: "draft", created_by: access.userId }).select("id").single();
  if (error || !copy) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20duplicar`);
  const { data: revision, error: revisionError } = await db.from("lesson_revisions").insert({ lesson_id: copy.id, revision: 1, title: copyTitle, summary: revisionResult.data?.summary ?? source.summary, estimated_minutes: revisionResult.data?.estimated_minutes ?? source.estimated_minutes, created_by: access.userId }).select("id").single();
  if (revisionError || !revision) {
    await createAdminClient().from("lessons").delete().eq("id", copy.id);
    redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20completar%20la%20copia`);
  }
  const blocks = blocksResult.data ?? [];
  const { error: blocksError } = blocks.length ? await db.from("content_blocks").insert(blocks.map(block => ({ ...block, revision_id: revision.id }))) : { error: null };
  const { error: pointerError } = blocksError ? { error: blocksError } : await db.from("lessons").update({ working_revision_id: revision.id }).eq("id", copy.id);
  if (pointerError) {
    await createAdminClient().from("lessons").delete().eq("id", copy.id);
    redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20completar%20la%20copia`);
  }
  revalidatePath(`/admin/modules/${moduleId}`);
  redirect(`/admin/modules/${moduleId}/lessons/${copy.id}`);
}

export async function changeLessonStatus(formData: FormData) {
  const access = await requireAdmin();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft", "published", "archived"].includes(status)) redirect(`/admin/modules/${moduleId}`);
  const db = await createClient();
  const { data: module } = await db.from("modules").select("id,slug").eq("id", moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("published_revision_id,slug").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!module || !lesson || (status === "published" && !lesson.published_revision_id)) redirect(`/admin/modules/${moduleId}?error=Publica%20la%20lección%20primero`);
  const { error } = await db.from("lessons").update({ status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", lessonId).eq("module_id", moduleId);
  if (error) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20cambiar%20el%20estado`);
  revalidatePath(`/admin/modules/${moduleId}`);
  revalidatePath(`/app/academy/${module.slug}`);
  revalidatePath(`/app/academy/${module.slug}/${lesson.slug}`);
  redirect(`/admin/modules/${moduleId}`);
}
