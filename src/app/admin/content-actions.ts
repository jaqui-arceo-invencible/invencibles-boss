"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBlocks, safeVideoUrl } from "@/lib/content/blocks";
import { storeCoverImage } from "@/lib/content/store-cover";

const resourceUploadTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["application/pdf", "pdf"],
]);

function matchesResourceMagic(type: string, bytes: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  switch (type) {
    case "image/jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": return ascii(1, 4) === "PNG";
    case "image/webp": return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/gif": return ascii(0, 3) === "GIF";
    case "application/pdf": return ascii(0, 5) === "%PDF-";
    default: return false;
  }
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function createModule(formData: FormData) {
  const access = await requireAdminOrEditor();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  if (!title || !access.teamId) redirect("/admin/modules?error=Escribe%20un%20título");
  const supabase = await createClient();
  const cover = await coverFromForm(formData, access.teamId, access.userId, title);
  if (!cover.ok) redirect(`/admin/modules?error=${encodeURIComponent(cover.message)}`);
  const { count } = await supabase.from("modules").select("id", { count: "exact", head: true }).eq("team_id", access.teamId);
  const slug = slugify(title);
  const { error } = await supabase.from("modules").insert({ team_id: access.teamId, title, slug, description, cover_resource_id: cover.id, position: count ?? 0, created_by: access.userId, status: "draft" });
  if (error) redirect(`/admin/modules?error=${encodeURIComponent(error.code === "23505" ? "Ya existe un módulo con ese título" : "No se pudo crear el módulo")}`);
  revalidatePath("/admin/modules");
  redirect("/admin/modules?created=1");
}

export async function createLesson(formData: FormData) {
  const access = await requireAdminOrEditor();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonFormat = String(formData.get("lesson_format") ?? "text");
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const title = lessonFormat === "video"
    ? "Lección en video"
    : String(formData.get("title") ?? "").trim().slice(0, 160);
  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  if (!module || !title || !["text", "video"].includes(lessonFormat) || (lessonFormat === "video" && !safeVideoUrl(videoUrl))) {
    redirect(`/admin/modules/${moduleId}?error=${encodeURIComponent(lessonFormat === "video" ? "Agrega un enlace válido de YouTube o Vimeo" : "Revisa el título")}`);
  }
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const slug = lessonFormat === "video"
    ? `leccion-en-video-${crypto.randomUUID().slice(0, 8)}`
    : slugify(title);
  const { data: lesson, error } = await supabase.from("lessons").insert({ module_id: moduleId, title, slug, position: count ?? 0, created_by: access.userId, status: "draft" }).select("id").single();
  if (error || !lesson) redirect(`/admin/modules/${moduleId}?error=${encodeURIComponent("No se pudo crear la lección")}`);
  const { data: revision, error: revisionError } = await supabase.from("lesson_revisions").insert({
    lesson_id: lesson.id,
    revision: 1,
    title,
    lesson_format: lessonFormat,
    video_url: lessonFormat === "video" ? videoUrl : "",
    created_by: access.userId,
  }).select("id").single();
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
  lessonFormat: "text" | "video";
  videoUrl: string;
  coverResourceId: string | null;
  blocksJson: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await requireAdminOrEditor();
  const moduleId = input.moduleId;
  const lessonId = input.lessonId;
  if (!/^[0-9a-f-]{36}$/i.test(moduleId) || !/^[0-9a-f-]{36}$/i.test(lessonId)) return { ok: false, message: "No encontramos la lección." };
  const title = input.title.trim().slice(0, 160);
  const summary = input.summary.trim().slice(0, 1000);
  const minutes = Math.max(1, Math.min(1440, Number(input.minutes) || 5));
  const lessonFormat = input.lessonFormat;
  const videoUrl = input.videoUrl.trim();
  if (!title) return { ok: false, message: "Escribe un título antes de guardar." };
  if (!["text", "video"].includes(lessonFormat)) return { ok: false, message: "El formato de la lección no es válido." };
  if (lessonFormat === "video" && !safeVideoUrl(videoUrl)) return { ok: false, message: "Usa un enlace válido de YouTube o Vimeo." };
  if (input.coverResourceId !== null && !/^[0-9a-f-]{36}$/i.test(input.coverResourceId)) return { ok: false, message: "La portada no es válida." };
  const supabase = await createClient();
  let blocks;
  try { blocks = parseBlocks(input.blocksJson); } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Revisa los bloques." };
  }
  if (lessonFormat === "video" && blocks.length) return { ok: false, message: "Las lecciones en video no usan bloques adicionales." };
  for (const block of blocks) if (block.type === "image" || block.type === "document") {
    const { data: resource } = await supabase.from("resources").select("id").eq("id", block.content.resourceId).eq("team_id", access.teamId).single();
    if (!resource) return { ok: false, message: "Hay un archivo que ya no pertenece a tu equipo." };
  }
  const { data: lesson } = await supabase.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!lesson) return { ok: false, message: "No encontramos la lección." };
  const { error } = await supabase.rpc("save_lesson_draft", {
    target_id: lessonId,
    new_title: title,
    new_summary: summary,
    new_minutes: minutes,
    new_format: lessonFormat,
    new_video_url: lessonFormat === "video" ? videoUrl : "",
    new_cover_resource_id: input.coverResourceId,
    new_blocks: blocks,
  });
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
    lessonFormat: String(formData.get("lesson_format") ?? "text") === "video" ? "video" : "text",
    videoUrl: String(formData.get("video_url") ?? ""),
    coverResourceId: String(formData.get("cover_resource_id") ?? "") || null,
    blocksJson: String(formData.get("blocks_json") ?? "[]"),
  });
  if (!result.ok) redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?error=${encodeURIComponent(result.message)}`);
  redirect(`/admin/modules/${moduleId}/lessons/${lessonId}?saved=1`);
}

export async function saveAndPublishLesson(input: Parameters<typeof persistLessonDraft>[0]): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  const saved = await persistLessonDraft(input);
  if (!saved.ok) return saved;
  const db = await createClient();
  const { error } = await db.rpc("publish_lesson", { target_id: input.lessonId });
  if (error) return { ok: false, message: "El borrador se guardó, pero no se pudo publicar. Inténtalo de nuevo." };
  revalidatePath(`/admin/modules/${input.moduleId}`);
  revalidatePath(`/admin/modules/${input.moduleId}/lessons/${input.lessonId}`);
  revalidatePath("/app/academy", "layout");
  revalidatePath("/app");
  revalidatePath("/app/resources");
  return { ok: true };
}

export async function saveLessonCover(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const access = await requireAdminOrEditor();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const file = formData.get("cover");
  if (!/^[0-9a-f-]{36}$/i.test(moduleId) || !/^[0-9a-f-]{36}$/i.test(lessonId) || !(file instanceof File)) {
    return { ok: false, message: "No pudimos leer la portada." };
  }

  const db = await createClient();
  const { data: lesson } = await db.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  const { data: course } = await db.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  if (!lesson || !course) return { ok: false, message: "No encontramos la lección." };

  const stored = await storeCoverImage({ teamId: access.teamId, userId: access.userId, title: "Portada de lección", file });
  if (!stored.ok) return stored;

  const { error } = await db.rpc("set_lesson_cover", { target_id: lessonId, new_cover_resource_id: stored.id });
  if (error) {
    const admin = createAdminClient();
    const { data: resource } = await admin.from("resources").select("storage_path").eq("id", stored.id).maybeSingle();
    await admin.from("resources").delete().eq("id", stored.id);
    if (resource?.storage_path) await admin.storage.from("academy-private").remove([resource.storage_path]);
    return { ok: false, message: "No se pudo guardar la portada." };
  }

  revalidatePath(`/admin/modules/${moduleId}/lessons/${lessonId}`);
  revalidatePath(`/app/academy`);
  return { ok: true, id: stored.id };
}

export async function removeLessonCover(input: { moduleId: string; lessonId: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await requireAdminOrEditor();
  if (!/^[0-9a-f-]{36}$/i.test(input.moduleId) || !/^[0-9a-f-]{36}$/i.test(input.lessonId)) {
    return { ok: false, message: "No encontramos la lección." };
  }
  const db = await createClient();
  const { data: course } = await db.from("modules").select("id").eq("id", input.moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("id").eq("id", input.lessonId).eq("module_id", input.moduleId).single();
  if (!course || !lesson) return { ok: false, message: "No encontramos la lección." };
  const { error } = await db.rpc("set_lesson_cover", { target_id: input.lessonId, new_cover_resource_id: null });
  if (error) return { ok: false, message: "No se pudo quitar la portada." };
  revalidatePath(`/admin/modules/${input.moduleId}/lessons/${input.lessonId}`);
  revalidatePath(`/app/academy`);
  return { ok: true };
}

export async function saveLessonResources(input: { moduleId: string; lessonId: string; resourceIds: string[] }): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await requireAdminOrEditor();
  const resourceIds = [...new Set(input.resourceIds)].slice(0, 20);
  if (!/^[0-9a-f-]{36}$/i.test(input.moduleId) || !/^[0-9a-f-]{36}$/i.test(input.lessonId) || resourceIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return { ok: false, message: "Los recursos no son válidos." };
  }

  const db = await createClient();
  const { data: course } = await db.from("modules").select("id,slug").eq("id", input.moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("id,slug").eq("id", input.lessonId).eq("module_id", input.moduleId).single();
  if (!course || !lesson) return { ok: false, message: "No encontramos la lección." };
  if (resourceIds.length) {
    const { count } = await db.from("resources").select("id", { count: "exact", head: true }).eq("team_id", access.teamId).in("id", resourceIds);
    if (count !== resourceIds.length) return { ok: false, message: "Uno de los recursos no pertenece a tu equipo." };
  }

  const { error: deleteError } = await db.from("lesson_resources").delete().eq("lesson_id", input.lessonId);
  if (deleteError) return { ok: false, message: "No se pudieron actualizar los recursos." };
  if (resourceIds.length) {
    const { error: insertError } = await db.from("lesson_resources").insert(resourceIds.map((resourceId, position) => ({
      lesson_id: input.lessonId,
      resource_id: resourceId,
      position,
    })));
    if (insertError) return { ok: false, message: "No se pudieron guardar los recursos." };
  }

  revalidatePath(`/admin/modules/${input.moduleId}/lessons/${input.lessonId}`);
  revalidatePath(`/app/academy/${course.slug}/${lesson.slug}`);
  revalidatePath("/app/resources");
  return { ok: true };
}

export async function uploadLessonResource(formData: FormData): Promise<
  { ok: true; resource: { id: string; title: string; fileName: string; mimeType: string; previewUrl?: string } }
  | { ok: false; message: string }
> {
  const access = await requireAdminOrEditor();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const file = formData.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(moduleId) || !/^[0-9a-f-]{36}$/i.test(lessonId)) {
    return { ok: false, message: "No encontramos la lección." };
  }
  if (!(file instanceof File) || !resourceUploadTypes.has(file.type) || file.size < 1 || file.size > 20 * 1024 * 1024 || !title) {
    return { ok: false, message: "Elige un archivo válido y escribe un nombre." };
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesResourceMagic(file.type, header)) {
    return { ok: false, message: "El archivo no coincide con su formato." };
  }

  const db = await createClient();
  const { data: course } = await db.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!course || !lesson) return { ok: false, message: "No encontramos la lección." };

  const extension = resourceUploadTypes.get(file.type);
  if (!extension) return { ok: false, message: "El archivo no es válido." };
  const path = `${access.teamId}/${access.userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await db.storage.from("academy-private").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, message: "No se pudo subir el archivo." };

  const { data: resource, error: insertError } = await db.from("resources").insert({
    team_id: access.teamId,
    uploaded_by: access.userId,
    title,
    file_name: file.name.slice(0, 255),
    storage_path: path,
    mime_type: file.type,
    file_size: file.size,
  }).select("id,title,file_name,mime_type").single();
  if (insertError || !resource) {
    await createAdminClient().storage.from("academy-private").remove([path]);
    return { ok: false, message: "No se pudo guardar el archivo." };
  }

  revalidatePath(`/admin/modules/${moduleId}/lessons/${lessonId}`);
  const signed = await db.storage.from("academy-private").createSignedUrl(path, 300);
  return {
    ok: true,
    resource: { id: resource.id, title: resource.title, fileName: resource.file_name, mimeType: resource.mime_type, previewUrl: signed.data?.signedUrl },
  };
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
  const { data: current } = await db.from("modules").select("cover_resource_id").eq("id", id).eq("team_id", access.teamId).single();
  if (!current) redirect("/admin/modules?error=No%20encontramos%20ese%20módulo");
  const cover = await coverFromForm(formData, access.teamId, access.userId, title);
  if (!cover.ok) redirect(`/admin/modules/${id}?error=${encodeURIComponent(cover.message)}`);
  const removeCover = formData.get("remove_cover") === "1";
  const coverId = cover.id ?? (removeCover ? null : current.cover_resource_id);
  const { error } = await db.from("modules").update({ title, description, cover_resource_id: coverId }).eq("id", id).eq("team_id", access.teamId);
  if (error) redirect(`/admin/modules/${id}?error=No%20se%20pudo%20guardar`);
  revalidatePath(`/admin/modules/${id}`);
  revalidatePath("/admin/modules");
  revalidatePath("/app");
  revalidatePath("/app/academy");
  redirect(`/admin/modules/${id}?saved=1`);
}

async function coverFromForm(formData: FormData, teamId: string, userId: string, title: string) {
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size < 1) return { ok: true as const, id: null };
  return storeCoverImage({ teamId, userId, title, file });
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
    const {data:oldRevision}=revisionId?await db.from("lesson_revisions").select("title,summary,estimated_minutes,lesson_format,video_url,cover_resource_id").eq("id",revisionId).single():{data:null};
    const {data:newRevision,error:revisionError}=await db.from("lesson_revisions").insert({lesson_id:newLesson.id,revision:1,title:oldRevision?.title??lesson.title,summary:oldRevision?.summary??lesson.summary,estimated_minutes:oldRevision?.estimated_minutes??lesson.estimated_minutes,lesson_format:oldRevision?.lesson_format??"text",video_url:oldRevision?.video_url??"",cover_resource_id:oldRevision?.cover_resource_id??null,created_by:access.userId}).select("id").single();
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
    revisionId ? db.from("lesson_revisions").select("title,summary,estimated_minutes,lesson_format,video_url,cover_resource_id").eq("id", revisionId).single() : Promise.resolve({ data: null, error: null }),
    revisionId ? db.from("content_blocks").select("type,content,position").eq("revision_id", revisionId).order("position") : Promise.resolve({ data: [], error: null }),
  ]);
  if (revisionResult.error || blocksResult.error) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20leer%20la%20lección`);
  const copyTitle = `${source.title.slice(0, 148)} (copia)`;
  const { data: copy, error } = await db.from("lessons").insert({ module_id: moduleId, title: copyTitle, slug: `${source.slug.slice(0, 65)}-copia-${crypto.randomUUID().slice(0, 8)}`, summary: source.summary, estimated_minutes: source.estimated_minutes, position: count ?? 0, status: "draft", created_by: access.userId }).select("id").single();
  if (error || !copy) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20duplicar`);
  const { data: revision, error: revisionError } = await db.from("lesson_revisions").insert({
    lesson_id: copy.id,
    revision: 1,
    title: copyTitle,
    summary: revisionResult.data?.summary ?? source.summary,
    estimated_minutes: revisionResult.data?.estimated_minutes ?? source.estimated_minutes,
    lesson_format: revisionResult.data?.lesson_format ?? "text",
    video_url: revisionResult.data?.video_url ?? "",
    cover_resource_id: revisionResult.data?.cover_resource_id ?? null,
    created_by: access.userId,
  }).select("id").single();
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

export async function deleteLesson(formData: FormData) {
  const access = await requireAdmin();
  const moduleId = String(formData.get("module_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(moduleId) || !/^[0-9a-f-]{36}$/i.test(lessonId)) redirect("/admin/modules");
  const db = await createClient();
  const { data: course } = await db.from("modules").select("id").eq("id", moduleId).eq("team_id", access.teamId).single();
  const { data: lesson } = await db.from("lessons").select("id").eq("id", lessonId).eq("module_id", moduleId).single();
  if (!course || !lesson) redirect(`/admin/modules/${moduleId}?error=Lección%20no%20encontrada`);
  const admin = createAdminClient();
  await admin.from("notifications").delete().eq("lesson_id", lessonId);
  const { error } = await admin.from("lessons").delete().eq("id", lessonId);
  if (error) redirect(`/admin/modules/${moduleId}?error=No%20se%20pudo%20eliminar%20la%20lección`);
  revalidatePath(`/admin/modules/${moduleId}`);
  revalidatePath("/admin/modules");
  revalidatePath("/app");
  revalidatePath("/app/academy");
  redirect(`/admin/modules/${moduleId}`);
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
