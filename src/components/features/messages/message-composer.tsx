"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { markConversationRead, sendMessage } from "@/app/app/messages/actions";
import { PrimaryButton } from "@/components/design/buttons";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);
  return null;
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendMessage, idle);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message === "sent") formRef.current?.reset();
  }, [state]);

  return <form ref={formRef} className="message-composer ds-form" action={action}>
    <input type="hidden" name="conversation_id" value={conversationId} />
    <label>Mensaje
      <textarea name="content" required minLength={1} maxLength={2000} rows={2} placeholder="Escribe un mensaje" />
    </label>
    <PrimaryButton type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar"}</PrimaryButton>
    {!state.ok && state.message ? <p className="form-note" role="status">{state.message}</p> : null}
  </form>;
}
