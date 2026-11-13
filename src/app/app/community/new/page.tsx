import { PageHeader } from "@/components/design/page-header";
import { PostComposer } from "@/components/features/community/post-composer";
import { requireMember } from "@/lib/auth/guards";
import { loadCategories } from "@/lib/community/feed";

export const instant = false;

export default async function NewCommunityPostPage() {
  const access = await requireMember();
  const categories = await loadCategories(access.teamId);
  return <main className="admin-page">
    <PageHeader title="Nueva publicación" backHref="/app/community" />
    {categories.length ? <PostComposer categories={categories} isAdmin={access.role === "admin"} /> : <p className="empty-copy">Todavía no hay categorías. La administración puede crearlas desde Comunidad.</p>}
  </main>;
}
