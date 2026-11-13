/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { formatLearningDuration, moduleStateLabel, type ModuleState } from "@/lib/learning/progress";

export function ModuleCard({ href, position, title, description, lessonCount, minutes, percent, state, coverUrl }: { href: string; position: number; title: string; description: string; lessonCount: number; minutes: number; percent: number; state: ModuleState; coverUrl: string | null }) {
  const number = String(position + 1).padStart(2, "0");
  const lessons = lessonCount === 1 ? "1 lección" : `${lessonCount} lecciones`;
  const progress = percent > 0 ? `${moduleStateLabel(state)} · ${percent}%` : moduleStateLabel(state);
  const safe = Math.max(0, Math.min(100, Math.round(percent)));

  return <Link className="course-card" href={href}>
    <span className="course-card-cover">
      {coverUrl ? <img src={coverUrl} alt="" /> : <span className="course-card-fallback" aria-hidden="true">{number}</span>}
      <span className="course-card-badges">
        <span>Módulo {number}</span>
        <span>{formatLearningDuration(minutes)}</span>
      </span>
    </span>
    <span className="course-card-body">
      <strong>{title}</strong>
      {description ? <span className="course-card-description">{description}</span> : null}
      <span className="course-card-meta">{lessons} · {progress}</span>
      <span className="ds-progress" aria-hidden="true"><span style={{ width: `${safe}%` }} /></span>
    </span>
  </Link>;
}
