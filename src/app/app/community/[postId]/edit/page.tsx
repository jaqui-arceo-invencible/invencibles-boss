/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import { notFound, redirect } from "next/navigation";
import { removePostImage } from "@/app/app/community/actions";
import { PageHeader } from "@/components/design/page-header";
import { EditPostForm } from "@/components/features/community/edit-post-form";
import { requireMember } from "@/lib/auth/guards";
import { loadCommunityPost } from "@/lib/community/feed";

export const instant = false;

export default async function EditCommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const access = await requireMember();
  const { postId } = await params;
  const loaded = await loadCommunityPost(access, postId);
  if (!loaded) notFound();
  if (loaded.post.authorId !== access.userId) redirect(`/app/community/${postId}`);
  const { post, categories } = loaded;

  return <main className="admin-page">
    <PageHeader title="Editar publicación" backHref={`/app/community/${post.id}`} />
    <EditPostForm postId={post.id} content={post.content} categoryId={post.categoryId} categories={categories} />
    {post.images.length ? <section>
      <h2 className="community-heading">Imágenes</h2>
      <div className="community-images">{post.images.map((image) => <figure key={image.id}>
        <img src={image.url} alt="" />
        <form action={removePostImage}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="image_id" value={image.id} />
          <button type="submit" className="community-quiet community-danger">Quitar imagen</button>
        </form>
      </figure>)}</div>
    </section> : null}
  </main>;
}
