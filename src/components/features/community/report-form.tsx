"use client";

import { useActionState } from "react";
import { createReport } from "@/app/app/community/actions";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton } from "@/components/design/buttons";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function ReportForm({ postId, commentId, messageId, conversationId }: { postId: string; commentId: string; messageId: string; conversationId: string }) {
  const [state, action, pending] = useActionState(createReport, idle);
  const backHref = conversationId ? `/app/messages/${conversationId}` : postId ? `/app/community/${postId}` : "/app/community";
  const ready = [postId, commentId, messageId].filter(Boolean).length === 1;
  return <main className="admin-page">
    <PageHeader title="Reportar" backHref={backHref} />
    {state.ok && state.message ? <p className="form-note" role="status">{state.message}</p> : <form className="ds-form community-form" action={action}>
      {postId ? <input type="hidden" name="post_id" value={postId} /> : null}
      {commentId ? <input type="hidden" name="comment_id" value={commentId} /> : null}
      {messageId ? <input type="hidden" name="message_id" value={messageId} /> : null}
      <label>Motivo
        <textarea name="reason" required minLength={1} maxLength={500} rows={5} placeholder="Qué ocurrió y por qué debe revisarse" />
      </label>
      <PrimaryButton type="submit" disabled={pending || !ready}>{pending ? "Enviando…" : "Enviar reporte"}</PrimaryButton>
      {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
    </form>}
  </main>;
}
