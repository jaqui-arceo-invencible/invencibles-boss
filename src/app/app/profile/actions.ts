"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/learning/action-state";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const name = String(formData.get("full_name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, message: "Escribe tu nombre, entre 2 y 80 caracteres." };
  const db = await createClient();
  const { error } = await db.from("profiles").update({ full_name: name }).eq("id", access.userId);
  if (error) return { ok: false, message: "No pudimos guardar tu nombre." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Nombre actualizado." };
}

export async function updateAvatar(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige una imagen." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "La imagen debe pesar menos de 5 MB." };
  const extension = extensionFor(file.type);
  if (!extension) return { ok: false, message: "Usa una imagen JPG, PNG o WebP." };
  const path = `${access.teamId}/avatars/${access.userId}/profile.${extension}`;
  const db = await createClient();
  const uploaded = await db.storage.from("academy-private").upload(path, file, { upsert: true, contentType: file.type });
  if (uploaded.error) return { ok: false, message: "No pudimos guardar la imagen." };
  const saved = await db.from("profiles").update({ avatar_path: path }).eq("id", access.userId);
  if (saved.error) return { ok: false, message: "La imagen se subió, pero no pudimos asociarla a tu perfil." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Imagen actualizada." };
}

export async function changePassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireMember();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { ok: false, message: "Usa al menos 12 caracteres." };
  if (password !== confirm) return { ok: false, message: "Las contraseñas no coinciden." };
  const db = await createClient();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { ok: false, message: "No pudimos cambiar la contraseña. Entra de nuevo e inténtalo otra vez." };
  return { ok: true, message: "Contraseña actualizada." };
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return null;
}
