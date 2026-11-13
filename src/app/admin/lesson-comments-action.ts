"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/learning/action-state";
import { isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

export async function setLessonComments(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireAdmin();
  const lessonId = String(formData.get("lesson_id") ?? "");
  const moduleId = String(formData.get("module_id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!isUuid(lessonId) || !isUuid(moduleId)) return { ok: false, message: "No encontramos la lección." };
  const db = await createClient();
  const owned = await db.from("modules").select("id, lessons!inner(id)").eq("id", moduleId).eq("team_id", access.teamId).eq("lessons.id", lessonId).maybeSingle();
  if (!owned.data) return { ok: false, message: "No encontramos la lección." };
  const updated = await db.from("lessons").update({ comments_enabled: enabled }).eq("id", lessonId).select("id");
  if (updated.error || !updated.data?.length) return { ok: false, message: "No pudimos cambiar los comentarios." };
  revalidatePath(`/admin/modules/${moduleId}/lessons/${lessonId}`);
  revalidatePath("/app/academy", "layout");
  return { ok: true, message: enabled ? "Comentarios abiertos." : "Comentarios cerrados." };
}
