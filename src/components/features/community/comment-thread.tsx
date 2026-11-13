"use client";

/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { MessageCircle, Plus, X } from "lucide-react";
import Link from "next/link";
import { createComment, deleteComment, updateComment } from "@/app/app/community/actions";
import { PrimaryButton } from "@/components/design/buttons";
import { CommunityText } from "@/components/features/community/community-text";
import { RealtimeRefresh } from "@/components/features/notices/realtime-refresh";
import type { CommunityComment } from "@/lib/community/feed";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

type ThreadProps = {
  title: string;
  comments: CommunityComment[];
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
  postId?: string;
  lessonId?: string;
  closedMessage?: string;
};

export function CommentThread({ title, comments, currentUserId, isAdmin, canComment, postId, lessonId, closedMessage }: ThreadProps) {
  const [composing, setComposing] = useState(false);
  const formId = useId();
  const top = comments.filter((comment) => !comment.parentId);
  const filter = postId ? `post_id=eq.${postId}` : lessonId ? `lesson_id=eq.${lessonId}` : "";
  return <section className="community-thread">
    {filter ? <RealtimeRefresh channel={`comments-${postId ?? lessonId}`} table="community_comments" filter={filter} /> : null}
    <div className="thread-heading"><h2><MessageCircle size={20} aria-hidden="true" />{title}<span className="thread-count">{comments.length}</span></h2>
      {canComment ? <button className="thread-compose-button" type="button" aria-expanded={composing} aria-controls={formId} onClick={() => setComposing((value) => !value)}>{composing ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{composing ? "Cerrar" : "Comentar"}</button> : null}
    </div>
    <div id={formId} hidden={!composing}>{composing && canComment ? <CommentForm postId={postId} lessonId={lessonId} label="Tu comentario" /> : null}</div>
    {!canComment ? <p className="form-hint">{closedMessage ?? "Los comentarios están cerrados."}</p> : null}
    {top.length === 0 ? <p className="thread-empty">¿Tienes una pregunta o algo que compartir? Este es tu espacio.</p> : top.map((comment) => <article key={comment.id} className="community-card">
      <CommentBody comment={comment} currentUserId={currentUserId} isAdmin={isAdmin} canReply={canComment} postId={postId} lessonId={lessonId} />
      <div className="comment-replies">{comments.filter((reply) => reply.parentId === comment.id).map((reply) => <CommentBody key={reply.id} comment={reply} currentUserId={currentUserId} isAdmin={isAdmin} canReply={false} postId={postId} lessonId={lessonId} />)}</div>
    </article>)}
  </section>;
}

function CommentBody({ comment, currentUserId, isAdmin, canReply, postId, lessonId }: { comment: CommunityComment; currentUserId: string; isAdmin: boolean; canReply: boolean; postId?: string; lessonId?: string }) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const mine = comment.authorId === currentUserId;
  return <div className="community-comment">
    <header>
      {comment.avatarUrl ? <img className="community-avatar" src={comment.avatarUrl} alt="" /> : <span className="community-avatar community-avatar-fallback" aria-hidden="true">{comment.authorName.slice(0, 1).toLocaleUpperCase()}</span>}
      <div>
        <strong>{comment.authorName}</strong>
        {comment.authorRole === "admin" ? <small>Administradora</small> : null}
        <p className="community-meta">{comment.createdLabel}{comment.edited ? " · Editado" : ""}</p>
      </div>
    </header>
    {editing ? <EditComment comment={comment} /> : <CommunityText text={comment.content} />}
    <div className="community-actions">
      {canReply ? <button type="button" className="community-quiet" onClick={() => setReplying((open) => !open)}>{replying ? "Cerrar respuesta" : "Responder"}</button> : null}
      {mine ? <button type="button" className="community-quiet" onClick={() => setEditing((open) => !open)}>{editing ? "Cerrar edición" : "Editar"}</button> : null}
      {mine || isAdmin ? <form action={deleteComment}><input type="hidden" name="comment_id" value={comment.id} /><button type="submit" className="community-quiet community-danger">Eliminar</button></form> : null}
      {!mine ? <Link className="community-quiet" href={`/app/community/report?comment=${comment.id}`}>Reportar</Link> : null}
    </div>
    {replying && canReply ? <CommentForm postId={postId} lessonId={lessonId} parentId={comment.id} label="Respuesta" /> : null}
  </div>;
}

function CommentForm({ postId, lessonId, parentId, label }: { postId?: string; lessonId?: string; parentId?: string; label: string }) {
  const [state, action, pending] = useActionState(createComment, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);
  return <form ref={formRef} className="ds-form community-form" action={action}>
    {postId ? <input type="hidden" name="post_id" value={postId} /> : null}
    {lessonId ? <input type="hidden" name="lesson_id" value={lessonId} /> : null}
    {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
    <label>{label}<textarea name="content" required minLength={1} maxLength={2000} rows={3} placeholder="Escribe una pregunta, idea o experiencia…" autoFocus /></label>
    <PrimaryButton type="submit" disabled={pending}>{pending ? "Publicando…" : "Publicar"}</PrimaryButton>
    {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
  </form>;
}

function EditComment({ comment }: { comment: CommunityComment }) {
  const [state, action, pending] = useActionState(updateComment, idle);
  if (state.ok && state.message) return <p className="form-note" role="status">{state.message}</p>;
  return <form className="ds-form community-form" action={action}>
    <input type="hidden" name="comment_id" value={comment.id} />
    <label>Editar comentario<textarea name="content" required minLength={1} maxLength={2000} rows={3} defaultValue={comment.content} /></label>
    <PrimaryButton type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</PrimaryButton>
    {state.message && !state.ok ? <p className="form-note" role="status">{state.message}</p> : null}
  </form>;
}
