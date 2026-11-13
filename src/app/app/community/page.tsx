import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { SecondaryButton } from "@/components/design/buttons";
import { CategoryForm } from "@/components/features/community/category-form";
import { PostCard } from "@/components/features/community/post-card";
import { requireMember } from "@/lib/auth/guards";
import { loadCommunityFeed } from "@/lib/community/feed";

export const instant = false;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const access = await requireMember();
  const search = await searchParams;
  const feed = await loadCommunityFeed(access, search);
  const pageQuery = (page: number) => {
    const params = new URLSearchParams();
    if (feed.query) params.set("q", feed.query);
    if (feed.category) params.set("category", feed.category);
    if (page > 1) params.set("page", String(page));
    const value = params.toString();
    return value ? `/app/community?${value}` : "/app/community";
  };

  return <main className="admin-page">
    <PageHeader title="Comunidad" action={<Link className="ds-icon-button" href="/app/community/new" aria-label="Nueva publicación"><Plus size={24} /></Link>} />
    <p className="ds-lead">Un espacio privado para preguntas, consejos y logros del equipo.</p>
    <form className="resource-filters ds-form" method="get">
      <label>Buscar<input name="q" defaultValue={feed.query} maxLength={80} /></label>
      <label>Categoría
        <select name="category" defaultValue={feed.category}>
          <option value="">Todas</option>
          {feed.categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <SecondaryButton type="submit">Filtrar</SecondaryButton>
    </form>
    {feed.failed ? <p className="empty-copy">No pudimos cargar la comunidad.</p> : null}
    {!feed.failed && feed.posts.length === 0 ? <p className="empty-copy">{feed.query || feed.category ? "No hay publicaciones con ese filtro." : "Todavía no hay publicaciones. Sé la primera en compartir algo."}</p> : null}
    <div className="community-list">{feed.posts.map((post) => <PostCard key={post.id} post={post} linked />)}</div>
    {feed.pageCount > 1 ? <nav className="lesson-pager" aria-label="Páginas de la comunidad">
      {feed.page > 1 ? <Link href={pageQuery(feed.page - 1)}>Anterior</Link> : <span />}
      <span>Página {feed.page} de {feed.pageCount}</span>
      {feed.page < feed.pageCount ? <Link href={pageQuery(feed.page + 1)}>Siguiente</Link> : <span />}
    </nav> : null}
    {access.role === "admin" ? <CategoryForm /> : null}
  </main>;
}
