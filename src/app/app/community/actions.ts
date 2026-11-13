"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireMember } from "@/lib/auth/guards";
import { categorySlug, communityImageExtension, plainCommunityText } from "@/lib/community/text";
import type { ActionState } from "@/lib/learning/action-state";
import { isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

const imageLimit = 5 * 1024 * 1024;

export async function createPost(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const content = plainCommunityText(String(formData.get("content") ?? ""), 4000);
  const categoryId = String(formData.get("category_id") ?? "");
  if (!content) return { ok: false, message: "Escribe entre 1 y 4000 caracteres." };
  if (!isUuid(categoryId)) return { ok: false, message: "Elige una categoría." };
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > 4) return { ok: false, message: "Puedes adjuntar hasta 4 imágenes." };
  for (const file of files) {
    if (file.size > imageLimit) return { ok: false, message: "Cada imagen debe pesar menos de 5 MB." };
    if (!communityImageExtension(file.type)) return { ok: false, message: "Usa imágenes JPG, PNG o WebP." };
  }

  const db = await createClient();
  const pinned = formData.get("pinned") === "on" && access.role === "admin";
  const inserted = await db.from("community_posts").insert({
    team_id: access.teamId,
    author_id: access.userId,
    category_id: categoryId,
    content,
    is_pinned: pinned,
  }).select("id").single();
  const postId = typeof inserted.data?.id === "string" ? inserted.data.id : "";
  if (inserted.error || !isUuid(postId)) return { ok: false, message: communityMessage(inserted.error?.message, "No pudimos publicar.") };

  const uploaded: string[] = [];
  for (const [position, file] of files.entries()) {
    const extension = communityImageExtension(file.type);
    if (!extension) continue;
    const path = `${access.teamId}/community/${access.userId}/${crypto.randomUUID()}.${extension}`;
    const stored = await db.storage.from("academy-private").upload(path, file, { contentType: file.type, upsert: false });
    if (stored.error) {
      await removeStoredPost(db, postId, uploaded);
      return { ok: false, message: "No pudimos guardar las imágenes." };
    }
    uploaded.push(path);
    const image = await db.from("post_images").insert({ post_id: postId, team_id: access.teamId, storage_path: path, position });
    if (image.error) {
      await removeStoredPost(db, postId, uploaded);
      return { ok: false, message: communityMessage(image.error.message, "No pudimos asociar las imágenes.") };
    }
  }

  revalidatePath("/app/community");
  redirect(`/app/community/${postId}`);
}

export async function updatePost(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const postId = String(formData.get("post_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const content = plainCommunityText(String(formData.get("content") ?? ""), 4000);
  if (!isUuid(postId) || !isUuid(categoryId) || !content) return { ok: false, message: "Revisa el texto y la categoría." };
  const db = await createClient();
  const updated = await db.from("community_posts").update({ content, category_id: categoryId }).eq("id", postId).eq("team_id", access.teamId).eq("author_id", access.userId).select("id");
  if (updated.error || !updated.data?.length) return { ok: false, message: communityMessage(updated.error?.message, "No pudimos guardar los cambios.") };
  revalidatePath("/app/community");
  revalidatePath(`/app/community/${postId}`);
  redirect(`/app/community/${postId}`);
}

export async function deletePost(formData: FormData) {
  const access = await requireMember();
  const postId = String(formData.get("post_id") ?? "");
  if (!isUuid(postId)) return;
  const db = await createClient();
  const images = await db.from("post_images").select("storage_path").eq("post_id", postId).eq("team_id", access.teamId);
  const paths = Array.isArray(images.data) ? images.data.flatMap((row) => typeof row.storage_path === "string" ? [row.storage_path] : []) : [];
  if (paths.length) await db.storage.from("academy-private").remove(paths);
  const removed = await db.from("community_posts").delete().eq("id", postId).eq("team_id", access.teamId).select("id");
  if (removed.error || !removed.data?.length) return;
  revalidatePath("/app/community");
  redirect("/app/community");
}

export async function removePostImage(formData: FormData) {
  const access = await requireMember();
  const postId = String(formData.get("post_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!isUuid(postId) || !isUuid(imageId)) return;
  const db = await createClient();
  const image = await db.from("post_images").select("storage_path").eq("id", imageId).eq("post_id", postId).eq("team_id", access.teamId).maybeSingle();
  const path = typeof image.data?.storage_path === "string" ? image.data.storage_path : "";
  if (path.startsWith(`${access.teamId}/community/`)) await db.storage.from("academy-private").remove([path]);
  await db.from("post_images").delete().eq("id", imageId).eq("post_id", postId).eq("team_id", access.teamId);
  revalidatePath(`/app/community/${postId}`);
  revalidatePath(`/app/community/${postId}/edit`);
}

export async function toggleReaction(formData: FormData) {
  const access = await requireMember();
  const postId = String(formData.get("post_id") ?? "");
  if (!isUuid(postId)) return;
  const db = await createClient();
  const existing = await db.from("post_reactions").select("post_id").eq("post_id", postId).eq("user_id", access.userId).maybeSingle();
  if (existing.data) await db.from("post_reactions").delete().eq("post_id", postId).eq("user_id", access.userId);
  else await db.from("post_reactions").insert({ post_id: postId, team_id: access.teamId, user_id: access.userId });
  revalidatePath("/app/community");
  revalidatePath(`/app/community/${postId}`);
}

export async function setPostPinned(formData: FormData) {
  const access = await requireAdmin();
  const postId = String(formData.get("post_id") ?? "");
  const pinned = formData.get("pinned") === "true";
  if (!isUuid(postId)) return;
  const db = await createClient();
  await db.from("community_posts").update({ is_pinned: pinned }).eq("id", postId).eq("team_id", access.teamId);
  revalidatePath("/app/community");
  revalidatePath(`/app/community/${postId}`);
}

export async function setPostHidden(formData: FormData) {
  const access = await requireAdmin();
  const postId = String(formData.get("post_id") ?? "");
  const hidden = formData.get("hidden") === "true";
  if (!isUuid(postId)) return;
  const db = await createClient();
  await db.from("community_posts").update({ status: hidden ? "hidden" : "visible" }).eq("id", postId).eq("team_id", access.teamId);
  revalidatePath("/app/community");
  revalidatePath(`/app/community/${postId}`);
}

export async function createComment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const content = plainCommunityText(String(formData.get("content") ?? ""), 2000);
  const postId = String(formData.get("post_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "");
  const hasPost = isUuid(postId);
  const hasLesson = isUuid(lessonId);
  if (!content) return { ok: false, message: "Escribe un comentario de hasta 2000 caracteres." };
  if (hasPost === hasLesson) return { ok: false, message: "No pudimos publicar el comentario." };
  const db = await createClient();
  const inserted = await db.from("community_comments").insert({
    team_id: access.teamId,
    author_id: access.userId,
    content,
    post_id: hasPost ? postId : null,
    lesson_id: hasLesson ? lessonId : null,
    parent_id: isUuid(parentId) ? parentId : null,
  });
  if (inserted.error) return { ok: false, message: communityMessage(inserted.error.message, "No pudimos publicar el comentario.") };
  revalidatePath("/app/community");
  if (hasPost) revalidatePath(`/app/community/${postId}`);
  revalidatePath("/app/academy", "layout");
  return { ok: true, message: "Comentario publicado." };
}

export async function updateComment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const commentId = String(formData.get("comment_id") ?? "");
  const content = plainCommunityText(String(formData.get("content") ?? ""), 2000);
  if (!isUuid(commentId) || !content) return { ok: false, message: "Escribe un comentario de hasta 2000 caracteres." };
  const db = await createClient();
  const updated = await db.from("community_comments").update({ content }).eq("id", commentId).eq("team_id", access.teamId).eq("author_id", access.userId).select("post_id");
  if (updated.error || !updated.data?.length) return { ok: false, message: communityMessage(updated.error?.message, "No pudimos guardar el comentario.") };
  revalidateCommunity(textId(updated.data[0]?.post_id));
  return { ok: true, message: "Comentario actualizado." };
}

export async function deleteComment(formData: FormData) {
  const access = await requireMember();
  const commentId = String(formData.get("comment_id") ?? "");
  if (!isUuid(commentId)) return;
  const db = await createClient();
  const removed = await db.from("community_comments").delete().eq("id", commentId).eq("team_id", access.teamId).select("post_id");
  revalidateCommunity(textId(removed.data?.[0]?.post_id));
}

export async function createReport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const reason = plainCommunityText(String(formData.get("reason") ?? ""), 500);
  const postId = String(formData.get("post_id") ?? "");
  const commentId = String(formData.get("comment_id") ?? "");
  const messageId = String(formData.get("message_id") ?? "");
  const hasPost = isUuid(postId);
  const hasComment = isUuid(commentId);
  const hasMessage = isUuid(messageId);
  if (!reason) return { ok: false, message: "Cuéntanos el motivo, hasta 500 caracteres." };
  if ([hasPost, hasComment, hasMessage].filter(Boolean).length !== 1) return { ok: false, message: "No pudimos enviar el reporte." };
  const db = await createClient();
  const inserted = await db.from("content_reports").insert({
    team_id: access.teamId,
    reporter_id: access.userId,
    reason,
    post_id: hasPost ? postId : null,
    comment_id: hasComment ? commentId : null,
    message_id: hasMessage ? messageId : null,
  });
  if (inserted.error) return { ok: false, message: communityMessage(inserted.error.message, "No pudimos enviar el reporte.") };
  return { ok: true, message: "Reporte enviado. La administración lo revisará." };
}

export async function createCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = categorySlug(name);
  if (!slug || name.length > 80) return { ok: false, message: "Escribe un nombre de categoría válido." };
  const db = await createClient();
  const last = await db.from("community_categories").select("position").eq("team_id", access.teamId).order("position", { ascending: false }).limit(1).maybeSingle();
  const position = typeof last.data?.position === "number" ? last.data.position + 1 : 0;
  const inserted = await db.from("community_categories").insert({ team_id: access.teamId, name, slug, position });
  if (inserted.error) return { ok: false, message: "Esa categoría ya existe o no se pudo guardar." };
  revalidatePath("/app/community");
  return { ok: true, message: "Categoría creada." };
}

function revalidateCommunity(postId: string) {
  revalidatePath("/app/community");
  if (postId) revalidatePath(`/app/community/${postId}`);
  revalidatePath("/app/academy", "layout");
}

function textId(value: unknown) {
  return typeof value === "string" ? value : "";
}

function communityMessage(detail: string | undefined, fallback: string) {
  const message = detail ?? "";
  if (message.includes("rate_limited")) return "Espera un momento antes de publicar otra vez.";
  if (message.includes("comments_closed")) return "Los comentarios de esta lección están cerrados.";
  if (message.includes("too_many_images")) return "Puedes adjuntar hasta 4 imágenes.";
  if (message.includes("duplicate key") || message.includes("23505")) return "Ya enviaste este reporte.";
  return fallback;
}

async function removeStoredPost(db: Awaited<ReturnType<typeof createClient>>, postId: string, paths: string[]) {
  if (paths.length) await db.storage.from("academy-private").remove(paths);
  await db.from("community_posts").delete().eq("id", postId);
}
