"use client";

import { useActionState } from "react";
import { createCategory } from "@/app/app/community/actions";
import { SecondaryButton } from "@/components/design/buttons";
import { SettingsSection } from "@/components/design/settings-section";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategory, idle);
  return <SettingsSection title="Categorías">
    <form className="ds-form" action={action}>
      <label>Nueva categoría<input name="name" required minLength={2} maxLength={80} /></label>
      <SecondaryButton type="submit" disabled={pending}>{pending ? "Guardando…" : "Agregar categoría"}</SecondaryButton>
      {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
    </form>
  </SettingsSection>;
}
