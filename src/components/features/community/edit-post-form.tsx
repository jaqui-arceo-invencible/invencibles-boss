"use client";

import { useActionState } from "react";
import { updatePost } from "@/app/app/community/actions";
import { PrimaryButton } from "@/components/design/buttons";
import type { CommunityCategory } from "@/lib/community/feed";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function EditPostForm({ postId, content, categoryId, categories }: { postId: string; content: string; categoryId: string; categories: CommunityCategory[] }) {
  const [state, action, pending] = useActionState(updatePost, idle);
  return <form className="ds-form community-form" action={action}>
    <input type="hidden" name="post_id" value={postId} />
    <label>Categoría
      <select name="category_id" defaultValue={categoryId} required>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </label>
    <label>Publicación
      <textarea name="content" required minLength={1} maxLength={4000} rows={6} defaultValue={content} />
    </label>
    <PrimaryButton type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</PrimaryButton>
    {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
  </form>;
}
