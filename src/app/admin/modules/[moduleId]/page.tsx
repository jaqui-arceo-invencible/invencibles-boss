/* eslint-disable @next/next/no-img-element -- Lesson covers use short-lived signed URLs from private Storage. */
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Copy, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { changeLessonStatus, changeModuleStatus, deleteLesson, duplicateLesson, moveContent, updateModule } from "@/app/admin/content-actions";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton, SecondaryButton } from "@/components/design/buttons";
import { SettingsSection } from "@/components/design/settings-section";
import { ConfirmSubmitButton } from "@/components/features/cms/confirm-submit-button";
import { CoverPicker } from "@/components/features/cms/cover-picker";
import { LessonCreateForm } from "@/components/features/cms/lesson-create-form";
import { requireAdminOrEditor } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "archived") return "Archivado";
  return "Publicado";
}

export default async function AdminModuleDetailPage({ params, searchParams }: { params: Promise<{ moduleId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const access = await requireAdminOrEditor();
  const { moduleId } = await params;
  const flash = await searchParams;
  const db = await createClient();
  const { data: course } = await db.from("modules").select("id,title,description,status,cover_resource_id").eq("id", moduleId).eq("team_id", access.teamId).single();
  if (!course) return <main className="admin-page"><PageHeader title="Módulo" backHref="/admin/modules" /><p>No encontramos ese módulo.</p></main>;
  const { data: lessonRows } = await db.from("lessons").select("id,title,summary,position,status,working_revision_id").eq("module_id", course.id).order("position");
  const lessons = lessonRows ?? [];
  const revisionIds = lessons.flatMap((lesson) => lesson.working_revision_id ? [lesson.working_revision_id] : []);
  const { data: revisions } = revisionIds.length
    ? await db.from("lesson_revisions").select("id,cover_resource_id").in("id", revisionIds)
    : { data: [] };
  const coverIds = (revisions ?? []).flatMap((revision) => revision.cover_resource_id ? [revision.cover_resource_id] : []);
  const { data: coverResources } = coverIds.length
    ? await db.from("resources").select("id,storage_path").eq("team_id", access.teamId).in("id", coverIds)
    : { data: [] };
  const coverUrls = Object.fromEntries(await Promise.all((coverResources ?? []).map(async (resource) => [
    resource.id,
    (await db.storage.from("academy-private").createSignedUrl(resource.storage_path, 300)).data?.signedUrl ?? "",
  ] as const)));
  const revisionById = new Map((revisions ?? []).map((revision) => [revision.id, revision]));
  let coverUrl: string | null = null;
  if (course.cover_resource_id) {
    const { data: resource } = await db.from("resources").select("storage_path").eq("id", course.cover_resource_id).eq("team_id", access.teamId).maybeSingle();
    if (resource?.storage_path) {
      const signed = await db.storage.from("academy-private").createSignedUrl(resource.storage_path, 300);
      coverUrl = signed.data?.signedUrl ?? null;
    }
  }

  return <main className="admin-page module-editor">
    <PageHeader title={course.title} backHref="/admin/modules" />
    <p className="ds-lead">{statusLabel(course.status)} · {lessons.length === 1 ? "1 lección" : `${lessons.length} lecciones`}</p>
    {flash.error ? <p role="alert" className="auth-error">{flash.error}</p> : null}
    {flash.saved ? <p role="status" className="inline-success">Cambios guardados.</p> : null}

    <div className="admin-module-overview">
      <div><span className={`status-badge status-${course.status}`}>{statusLabel(course.status)}</span><p>{course.status === "published" ? "Visible en la academia de las socias." : "Este módulo no aparece en la academia de las socias."}</p></div>
      {access.role === "admin" ? <form action={changeModuleStatus}><input type="hidden" name="module_id" value={course.id} /><input type="hidden" name="status" value={course.status === "published" ? "draft" : "published"} />{course.status === "published" ? <SecondaryButton type="submit">Pasar a borrador</SecondaryButton> : <PrimaryButton type="submit"><Send size={18} aria-hidden="true" />Publicar módulo</PrimaryButton>}</form> : null}
    </div>

    <details className="admin-disclosure">
      <summary><Pencil size={18} aria-hidden="true" />Editar datos y portada del módulo<ChevronDown size={18} aria-hidden="true" /></summary>
      <div className="admin-disclosure-body"><SettingsSection title="Datos del módulo">
      <form action={updateModule} className="cms-form">
        <input type="hidden" name="module_id" value={course.id} />
        <label>Título<input name="title" required maxLength={160} defaultValue={course.title} /></label>
        <label>Descripción<textarea name="description" maxLength={1000} rows={4} defaultValue={course.description ?? ""} /></label>
        <CoverPicker currentUrl={coverUrl} />
        <PrimaryButton type="submit">Guardar datos del módulo</PrimaryButton>
      </form>
    </SettingsSection></div>
    </details>

    <div className="admin-list-heading"><div><h2>Lecciones</h2><p>Crea o abre una lección para editar su contenido.</p></div><LessonCreateForm moduleId={course.id} /></div>

    <section aria-label={`Lecciones (${lessons.length})`}>
      {lessons.length ? <ol className="module-lessons">{lessons.map((lesson, index) => {
        const coverId = lesson.working_revision_id ? revisionById.get(lesson.working_revision_id)?.cover_resource_id : null;
        const coverUrl = coverId ? coverUrls[coverId] : "";
        return <li key={lesson.id}>
        <Link className="module-lesson" href={`/admin/modules/${course.id}/lessons/${lesson.id}`}>
          {coverUrl ? <span className="course-lesson-cover"><img src={coverUrl} alt="" /></span> : <span className="course-lesson-mark" aria-hidden="true"><small>Lección</small><strong>{String(index + 1).padStart(2, "0")}</strong></span>}
          <span className="course-lesson-copy">
            <strong>{lesson.title}</strong>
            <small>{lesson.summary || "Sin resumen"} · {lesson.status === "draft" ? "Borrador" : lesson.status === "archived" ? "Archivada" : "Publicada"}</small>
          </span>
          <ChevronRight size={24} aria-hidden="true" />
        </Link>
        <details className="admin-lesson-actions">
          <summary><MoreHorizontal size={18} aria-hidden="true" />Más acciones<span className="sr-only"> para {lesson.title}</span></summary>
          <div className="module-lesson-tools">
          <div className="module-lesson-icon-actions" aria-label={`Acciones de ${lesson.title}`}>
            {[-1, 1].map((direction) => <form action={moveContent} key={direction}>
              <input type="hidden" name="kind" value="lesson" />
              <input type="hidden" name="id" value={lesson.id} />
              <input type="hidden" name="module_id" value={course.id} />
              <input type="hidden" name="direction" value={direction} />
              <button className="icon-tool" type="submit" aria-label={`${direction < 0 ? "Subir" : "Bajar"} ${lesson.title}`}>{direction < 0 ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}</button>
            </form>)}
            <form action={duplicateLesson}>
              <input type="hidden" name="module_id" value={course.id} />
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <button className="icon-tool" type="submit" aria-label={`Duplicar ${lesson.title}`}><Copy size={20} aria-hidden="true" /></button>
            </form>
            {access.role === "admin" ? <form action={deleteLesson}>
              <input type="hidden" name="module_id" value={course.id} />
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <ConfirmSubmitButton label={`Eliminar ${lesson.title}`} confirm={`¿Eliminar «${lesson.title}»? No se puede deshacer.`} danger><Trash2 size={20} aria-hidden="true" /></ConfirmSubmitButton>
            </form> : null}
          </div>
          {access.role === "admin" ? <form action={changeLessonStatus} className="module-lesson-status-form">
            <input type="hidden" name="module_id" value={course.id} />
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <label>Estado
              <select name="status" defaultValue={lesson.status}>
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
                <option value="archived">Archivada</option>
              </select>
            </label>
            <button type="submit">Aplicar</button>
          </form> : null}
          </div>
        </details>
      </li>;
      })}</ol> : <p className="editor-note">Este módulo todavía no tiene lecciones.</p>}
    </section>

    {access.role === "admin" && course.status !== "archived" ? <details className="admin-disclosure"><summary>Archivar módulo<ChevronDown size={18} aria-hidden="true" /></summary><div className="admin-disclosure-body"><p>Lo oculta de la academia y conserva sus lecciones.</p><form action={changeModuleStatus}><input type="hidden" name="module_id" value={course.id} /><input type="hidden" name="status" value="archived" /><SecondaryButton type="submit">Archivar módulo</SecondaryButton></form></div></details> : null}
  </main>;
}
