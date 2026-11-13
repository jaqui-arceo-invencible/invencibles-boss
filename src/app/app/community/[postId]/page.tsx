import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePost, setPostHidden, setPostPinned } from "@/app/app/community/actions";
import { PageHeader } from "@/components/design/page-header";
import { SecondaryButton } from "@/components/design/buttons";
import { CommentThread } from "@/components/features/community/comment-thread";
import { CopyLinkButton } from "@/components/features/community/copy-link-button";
import { PostCard } from "@/components/features/community/post-card";
import { requireMember } from "@/lib/auth/guards";
import { loadCommunityPost } from "@/lib/community/feed";

export const instant = false;

export default async function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const access = await requireMember();
  const { postId } = await params;
  const loaded = await loadCommunityPost(access, postId);
  if (!loaded) notFound();
  const { post, comments } = loaded;
  const mine = post.authorId === access.userId;

  return <main className="admin-page">
    <PageHeader title="Publicación" backHref="/app/community" />
    <PostCard post={post} />
    <div className="community-actions">
      <CopyLinkButton path={`/app/community/${post.id}`} />
      {mine ? <Link className="ds-button ds-button-secondary" href={`/app/community/${post.id}/edit`}>Editar</Link> : null}
      {!mine ? <Link className="ds-button ds-button-secondary" href={`/app/community/report?post=${post.id}`}>Reportar</Link> : null}
    </div>
    {access.role === "admin" ? <div className="community-actions">
      <form action={setPostPinned}>
        <input type="hidden" name="post_id" value={post.id} />
        <input type="hidden" name="pinned" value={post.pinned ? "false" : "true"} />
        <SecondaryButton type="submit">{post.pinned ? "Quitar fijado" : "Fijar"}</SecondaryButton>
      </form>
      <form action={setPostHidden}>
        <input type="hidden" name="post_id" value={post.id} />
        <input type="hidden" name="hidden" value={post.status === "hidden" ? "false" : "true"} />
        <SecondaryButton type="submit">{post.status === "hidden" ? "Mostrar de nuevo" : "Ocultar"}</SecondaryButton>
      </form>
    </div> : null}
    {mine || access.role === "admin" ? <form action={deletePost}>
      <input type="hidden" name="post_id" value={post.id} />
      <button type="submit" className="ds-button ds-button-danger">Eliminar publicación</button>
    </form> : null}
    <CommentThread title="Comentarios" comments={comments} currentUserId={access.userId} isAdmin={access.role === "admin"} canComment={post.status === "visible"} postId={post.id} closedMessage="Esta publicación está oculta y no acepta comentarios." />
  </main>;
}
