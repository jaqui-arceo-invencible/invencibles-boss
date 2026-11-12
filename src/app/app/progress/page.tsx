import Link from "next/link";
import { PageHeader } from "@/components/design/page-header";
import { ProgressMeter } from "@/components/design/progress-meter";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { memberCopy } from "@/lib/learning/copy";
import { formatLearningDateTime, moduleStateLabel } from "@/lib/learning/progress";

export const instant = false;

export default async function ProgressPage() {
  const access = await requireMember();
  const learning = await loadLearningSnapshot(access);
  return <main className="admin-page">
    <PageHeader title="Mis avances" backHref="/app" />
    <section className="stat-row" aria-label="Resumen de aprendizaje">
      <article className="stat-card"><strong>{learning.overall.completed}</strong><span>Lecciones completadas</span></article>
      <article className="stat-card"><strong>{learning.overall.pending}</strong><span>Lecciones pendientes</span></article>
      <article className="stat-card"><strong>{learning.overall.percent}%</strong><span>Progreso general</span></article>
    </section>
    <p className="learn-meta">Última actividad: {learning.lastActivityAt ? formatLearningDateTime(learning.lastActivityAt) : "Todavía no hay actividad"}</p>
    <ProgressMeter value={learning.overall.percent} label="Progreso general" />
    {learning.continueHref ? <Link className="ds-button ds-button-primary" href={learning.continueHref}>{learning.hasStarted ? memberCopy.continueLearning : memberCopy.start}</Link> : null}
    <section>
      <h2 className="section-label">Progreso por módulo</h2>
      {learning.modules.length ? <ul className="progress-modules">{learning.modules.map((module) => <li key={module.id}>
        <div><strong>{module.title}</strong><span>{module.progress.completed} de {module.progress.total} · {moduleStateLabel(module.progress.state)}</span></div>
        <ProgressMeter value={module.progress.percent} label={`Progreso de ${module.title}`} />
      </li>)}</ul> : <p className="empty-copy">{memberCopy.emptyAcademy}</p>}
    </section>
    <section>
      <h2 className="section-label">Lecciones completadas</h2>
      {learning.recentCompletions.length ? <ul className="member-lessons">{learning.recentCompletions.map((item) => <li key={item.href}>
        <Link href={item.href}><span><strong>{item.title}</strong><small>{item.moduleTitle} · {formatLearningDateTime(item.completedAt)}</small></span></Link>
      </li>)}</ul> : <p className="empty-copy">Cuando completes una lección, aparecerá aquí.</p>}
    </section>
  </main>;
}
