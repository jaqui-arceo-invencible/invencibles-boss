/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { SecondaryButton } from "@/components/design/buttons";
import { requireMember } from "@/lib/auth/guards";
import { loadPublishedResources, signResourceMap } from "@/lib/learning/catalog";
import { paginate } from "@/lib/learning/progress";

export const instant = false;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; module?: string; page?: string }> }) {
  const access = await requireMember();
  const params = await searchParams;
  const catalog = await loadPublishedResources(access);
  const query = (params.q ?? "").trim();
  const type = params.type === "image" || params.type === "document" ? params.type : "";
  const moduleSlug = catalog.modules.some((module) => module.slug === params.module) ? params.module ?? "" : "";
  const filtered = catalog.items.filter((item) => {
    if (type && item.kind !== type) return false;
    if (moduleSlug && item.moduleSlug !== moduleSlug) return false;
    if (!query) return true;
    const haystack = `${item.title} ${item.description} ${item.lessonTitle} ${item.moduleTitle}`.toLocaleLowerCase("es-MX");
    return haystack.includes(query.toLocaleLowerCase("es-MX"));
  });
  const page = paginate(filtered, Number(params.page ?? "1"), 12);
  const urls = await signResourceMap(access.teamId, page.items);
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (type) search.set("type", type);
    if (moduleSlug) search.set("module", moduleSlug);
    if (nextPage > 1) search.set("page", String(nextPage));
    const value = search.toString();
    return value ? `/app/resources?${value}` : "/app/resources";
  };

  return <main className="admin-page">
    <PageHeader title="Mis recursos" backHref="/app" />
    <p className="ds-lead">Materiales de las lecciones que ya están publicadas.</p>
    <form className="ds-form resource-filters" action="/app/resources">
      <label>Buscar<input name="q" defaultValue={query} placeholder="Nombre o descripción" /></label>
      <label>Tipo<select name="type" defaultValue={type}><option value="">Todos</option><option value="image">Imágenes</option><option value="document">Documentos</option></select></label>
      <label>Módulo<select name="module" defaultValue={moduleSlug}><option value="">Todos</option>{catalog.modules.map((module) => <option key={module.slug} value={module.slug}>{module.title}</option>)}</select></label>
      <SecondaryButton type="submit">Filtrar</SecondaryButton>
    </form>
    {page.total === 0 ? <p className="empty-copy">Todavía no hay materiales publicados para ti.</p> : <>
      <div className="learn-grid">{page.items.map((item) => {
        const url = urls.get(item.id) ?? "";
        return <article className="learn-card" key={item.id}>
          {item.kind === "image" && url ? <img className="learn-cover" src={url} alt="" /> : <span className="resource-icon" aria-hidden="true">{item.kind === "document" ? <FileText size={28} /> : <ImageIcon size={28} />}</span>}
          <h3>{item.title}</h3>
          <p className="learn-meta">{item.kind === "document" ? "Documento" : "Imagen"} · {item.moduleTitle}</p>
          {item.description ? <p>{item.description}</p> : null}
          <p className="learn-meta">{item.lessonTitle}</p>
          {url ? <a className="ds-button ds-button-primary" href={url} target="_blank" rel="noreferrer">Abrir</a> : <p className="form-note">El archivo no está disponible en este momento.</p>}
        </article>;
      })}</div>
      {page.pageCount > 1 ? <nav className="lesson-pager" aria-label="Páginas de recursos">
        {page.page > 1 ? <Link href={pageHref(page.page - 1)}>Anterior</Link> : <span />}
        <span>Página {page.page} de {page.pageCount}</span>
        {page.page < page.pageCount ? <Link href={pageHref(page.page + 1)}>Siguiente</Link> : <span />}
      </nav> : null}
    </>}
  </main>;
}
