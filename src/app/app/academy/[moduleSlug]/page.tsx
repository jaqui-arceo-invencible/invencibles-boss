/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { ProgressMeter } from "@/components/design/progress-meter";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { lessonStatusLabel, moduleStateLabel, type LessonStatus } from "@/lib/learning/progress";

export const instant = false;

function StatusIcon({ status }: { status: LessonStatus }) {
  if (status === "completed") return <CheckCircle2 size={22} aria-hidden="true" />;
  if (status === "in_progress") return <CircleDot size={22} aria-hidden="true" />;
  return <Circle size={22} aria-hidden="true" />;
}

export default async function AcademyModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const access = await requireMember();
  const { moduleSlug } = await params;
  const learning = await loadLearningSnapshot(access);
  const course = learning.modules.find((item) => item.slug === moduleSlug);
  if (!course) notFound();
  const next = course.lessons.find((lesson) => lesson.status === "in_progress") ?? course.lessons.find((lesson) => lesson.status !== "completed") ?? course.lessons[0];
  const action = course.progress.state === "completed" ? "Repasar" : course.progress.state === "in_progress" ? "Continuar" : "Comenzar";

  return <main className="admin-page">
    <PageHeader title={course.title} backHref="/app/academy" />
    {course.coverUrl ? <img className="learn-cover learn-cover-wide" src={course.coverUrl} alt="" /> : null}
    {course.description ? <p className="ds-lead">{course.description}</p> : null}
    <p className="learn-meta">{course.lessons.length === 1 ? "1 lección publicada" : `${course.lessons.length} lecciones publicadas`} · {moduleStateLabel(course.progress.state)} · {course.progress.percent}%</p>
    <ProgressMeter value={course.progress.percent} label={`Progreso de ${course.title}`} />
    {next ? <Link className="ds-button ds-button-primary" href={`/app/academy/${course.slug}/${next.slug}`}>{action}</Link> : <p className="empty-copy">Este módulo todavía no tiene lecciones publicadas.</p>}
    <ol className="member-lessons">{course.lessons.map((lesson, index) => <li key={lesson.id}>
      <Link href={`/app/academy/${course.slug}/${lesson.slug}`} aria-label={`${lesson.title}, ${lessonStatusLabel(lesson.status)}`}>
        <StatusIcon status={lesson.status} />
        <span><strong>{String(index + 1).padStart(2, "0")}  {lesson.title}</strong><small>{lesson.summary || lessonStatusLabel(lesson.status)}</small></span>
      </Link>
    </li>)}</ol>
  </main>;
}
