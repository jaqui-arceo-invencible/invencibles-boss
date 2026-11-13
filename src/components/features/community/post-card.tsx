/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { Heart } from "lucide-react";
import { toggleReaction } from "@/app/app/community/actions";
import { CommunityText } from "@/components/features/community/community-text";
import type { CommunityPostCard } from "@/lib/community/feed";

export function PostCard({ post, linked }: { post: CommunityPostCard; linked?: boolean }) {
  return <article className="community-card">
    <header>
      {post.avatarUrl ? <img className="community-avatar" src={post.avatarUrl} alt="" /> : <span className="community-avatar community-avatar-fallback" aria-hidden="true">{post.authorName.slice(0, 1).toLocaleUpperCase()}</span>}
      <div>
        <strong>{post.authorName}</strong>
        {post.authorRole === "admin" ? <small>Administradora</small> : null}
        <p className="community-meta">{post.categoryName} · {post.createdLabel}{post.edited ? " · Editada" : ""}{post.pinned ? " · Fijada" : ""}{post.status === "hidden" ? " · Oculta" : ""}</p>
      </div>
    </header>
    <CommunityText text={post.content} />
    {post.images.length ? <div className="community-images">{post.images.map((image) => <img key={image.id} src={image.url} alt="" />)}</div> : null}
    <div className="community-actions">
      <form action={toggleReaction}>
        <input type="hidden" name="post_id" value={post.id} />
        <button type="submit" className="community-quiet" aria-pressed={post.likedByMe} aria-label={post.likedByMe ? "Quitar me gusta" : "Me gusta"}>
          <Heart size={18} aria-hidden="true" fill={post.likedByMe ? "currentColor" : "none"} />
          <span>{post.likeCount}</span>
        </button>
      </form>
      {linked ? <Link className="community-quiet" href={`/app/community/${post.id}`}>{post.commentCount === 1 ? "1 comentario" : `${post.commentCount} comentarios`}</Link> : <span className="community-meta">{post.commentCount === 1 ? "1 comentario" : `${post.commentCount} comentarios`}</span>}
    </div>
  </article>;
}
