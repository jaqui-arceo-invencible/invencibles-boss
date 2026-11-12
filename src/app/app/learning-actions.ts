"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth/guards";
import { checklistItemIdPattern, isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/learning/action-state";

export async function recordLessonOpen(lessonId: string, moduleSlug: string): Promise<ActionState> {
  if (!isUuid(lessonId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduleSlug)) return { ok: false, message: "No encontramos esa lección." };
  await requireMember();
  const db = await createClient();
  const { error } = await db.rpc("touch_lesson_progress", { target_lesson: lessonId, mark_complete: false });
  if (error) return { ok: false, message: "No pudimos registrar que abriste la lección." };
  revalidatePath("/app");
  revalidatePath("/app/academy");
  revalidatePath("/app/progress");
  revalidatePath(`/app/academy/${moduleSlug}`);
  return { ok: true, message: "" };
}

export async function completeLesson(lessonId: string): Promise<ActionState> {
  if (!isUuid(lessonId)) return { ok: false, message: "No encontramos esa lección." };
  await requireMember();
  const db = await createClient();
  const { error } = await db.rpc("touch_lesson_progress", { target_lesson: lessonId, mark_complete: true });
  if (error) return { ok: false, message: "No pudimos marcar la lección como completada." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Lección completada." };
}

export async function setChecklistItem(lessonId: string, blockId: string, itemId: string, completed: boolean): Promise<ActionState> {
  if (!isUuid(lessonId) || !isUuid(blockId) || !checklistItemIdPattern.test(itemId)) {
    return { ok: false, message: "No pudimos guardar esa actividad." };
  }
  await requireMember();
  const db = await createClient();
  const { error } = await db.rpc("set_checklist_item", {
    target_lesson: lessonId,
    target_block: blockId,
    target_item: itemId,
    is_completed: completed,
  });
  if (error) return { ok: false, message: "No pudimos guardar la actividad." };
  revalidatePath("/app/academy", "layout");
  return { ok: true, message: completed ? "Actividad marcada." : "Actividad pendiente de nuevo." };
}
