/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { ProgressMeter } from "@/components/design/progress-meter";
import { moduleStateLabel, type ModuleState } from "@/lib/learning/progress";

export function ModuleCard({ href, position, title, description, lessonCount, percent, state, coverUrl }: { href: string; position: number; title: string; description: string; lessonCount: number; percent: number; state: ModuleState; coverUrl: string | null }) {
  return <article className="learn-card">
    {coverUrl ? <img className="learn-cover" src={coverUrl} alt="" /> : null}
    <p className="learn-kicker">Módulo {String(position + 1).padStart(2, "0")}</p>
    <h3>{title}</h3>
    {description ? <p>{description}</p> : null}
    <p className="learn-meta">{lessonCount === 1 ? "1 lección" : `${lessonCount} lecciones`} · {moduleStateLabel(state)}</p>
    <ProgressMeter value={percent} label={`Progreso de ${title}`} />
    <Link className="ds-button ds-button-primary" href={href}>Entrar</Link>
  </article>;
}
