import Link from "next/link";
import { PageHeader } from "@/components/design/page-header";
import { setContentVisibility } from "@/app/admin/community/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { loadModerationQueue } from "@/lib/community/moderation";

export const instant = false;

const filters = [
  { id: "open", label: "Abiertos" },
  { id: "resolved", label: "Resueltos" },
  { id: "dismissed", label: "Descartados" },
];

export default async function AdminCommunityPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const access = await requireAdmin();
  const params = await searchParams;
  const queue = await loadModerationQueue(access, params.estado ?? "open");
  return <main className="admin-page">
    <PageHeader title="Comunidad" backHref="/admin" />
    <section className="stat-row" aria-label="Resumen de moderación">
      <article className="stat-card"><strong>{queue.openCount}</strong><span>Reportes abiertos</span></article>
      <article className="stat-card"><strong>{queue.hiddenCount}</strong><span>Publicaciones ocultas</span></article>
    </section>
    <div className="community-actions" aria-label="Filtrar reportes">
      {filters.map((filter) => <Link key={filter.id} href={filter.id === "open" ? "/admin/community" : `/admin/community?estado=${filter.id}`} aria-current={queue.filter === filter.id ? "page" : undefined} className="community-quiet">{filter.label}</Link>)}
    </div>
    <h2 className="community-heading">Reportes</h2>
    {queue.reports.length === 0 ? <p className="empty-copy">No hay reportes en esta lista.</p> : <ul className="conversation-list">
      {queue.reports.map((report) => <li key={report.id}>
        <Link href={`/admin/community/${report.id}`} className="conversation-row">
          <span className="conversation-copy"><strong>{report.target}</strong><small>{report.reason}</small></span>
          <span className="conversation-meta"><time>{report.when}</time></span>
        </Link>
      </li>)}
    </ul>}
    <h2 className="community-heading">Publicaciones recientes</h2>
    {queue.posts.length === 0 ? <p className="empty-copy">Todavía no hay publicaciones.</p> : <div className="community-list">
      {queue.posts.map((post) => <article key={post.id} className="community-card">
        <p className="community-body">{post.excerpt}</p>
        <p className="community-meta">{post.status === "hidden" ? "Oculta" : "Visible"}{post.pinned ? " · Aviso fijado" : ""}</p>
        <form action={setContentVisibility}>
          <input type="hidden" name="kind" value="post" />
          <input type="hidden" name="content_id" value={post.id} />
          <input type="hidden" name="status" value={post.status === "hidden" ? "visible" : "hidden"} />
          <button type="submit" className="community-quiet">{post.status === "hidden" ? "Restaurar" : "Ocultar"}</button>
        </form>
      </article>)}
    </div>}
  </main>;
}
