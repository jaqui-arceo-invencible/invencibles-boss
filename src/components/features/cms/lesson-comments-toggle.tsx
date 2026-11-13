"use client";

import { useActionState } from "react";
import { setLessonComments } from "@/app/admin/lesson-comments-action";
import { SecondaryButton } from "@/components/design/buttons";
import { SettingsSection } from "@/components/design/settings-section";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function LessonCommentsToggle({ moduleId, lessonId, enabled }: { moduleId: string; lessonId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(setLessonComments, idle);
  return <SettingsSection title="Comentarios de la lección">
    <form className="ds-form" action={action}>
      <input type="hidden" name="module_id" value={moduleId} />
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <p className="form-hint">{enabled ? "Las socias pueden comentar esta lección publicada." : "Los comentarios están cerrados. Los que ya existen siguen visibles."}</p>
      <SecondaryButton type="submit" disabled={pending}>{pending ? "Guardando…" : enabled ? "Cerrar comentarios" : "Abrir comentarios"}</SecondaryButton>
      {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
    </form>
  </SettingsSection>;
}
