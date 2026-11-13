/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/design/page-header";
import { ProgressMeter } from "@/components/design/progress-meter";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { formatLearningDuration, lessonStatusLabel, moduleStateLabel } from "@/lib/learning/progress";

export const instant = false;

export default async function AcademyModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const access = await requireMember();
  const { moduleSlug } = await params;
  const learning = await loadLearningSnapshot(access);
  const course = learning.modules.find((item) => item.slug === moduleSlug);
  if (!course) notFound();
  const minutes = course.lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0);
  const lessonCount = course.lessons.length === 1 ? "1 lección" : `${course.lessons.length} lecciones`;

  return <main className="admin-page member-course-page">
    <PageHeader backHref="/app/academy" />
    <section className="course-hero">
      {course.coverUrl ? <div className="course-hero-cover"><img src={course.coverUrl} alt="" /></div> : null}
      <div className="course-hero-copy">
        <h1 className="course-hero-title">{course.title}</h1>
        {course.description ? <p>{course.description}</p> : null}
      </div>
      <p className="course-stats">
        <span>{lessonCount}</span>
        <span>{formatLearningDuration(minutes)}</span>
        <span>{course.progress.percent > 0 ? `${moduleStateLabel(course.progress.state)} · ${course.progress.percent}%` : moduleStateLabel(course.progress.state)}</span>
      </p>
      <ProgressMeter value={course.progress.percent} label={`Progreso de ${course.title}`} />
      {!course.lessons.length ? <p className="empty-copy">Este módulo todavía no tiene lecciones publicadas.</p> : null}
    </section>
    {course.lessons.length ? <section className="course-outline">
      <h2>Lecciones</h2>
      <ol className="course-lessons">{course.lessons.map((lesson, index) => <li key={lesson.id}>
        <Link className="course-lesson" href={`/app/academy/${course.slug}/${lesson.slug}`} aria-label={`${lesson.title}, ${lessonStatusLabel(lesson.status)}`}>
          <span className="course-lesson-art" aria-hidden="true">
            {lesson.coverUrl ? <img src={lesson.coverUrl} alt="" /> : <span className="course-lesson-mark"><small>Lección</small><strong>{String(index + 1).padStart(2, "0")}</strong></span>}
          </span>
          <span className="course-lesson-copy">
            <strong>{lesson.title}</strong>
            {lesson.summary ? <small>{lesson.summary}</small> : null}
            <span className="learn-meta">{formatLearningDuration(lesson.estimatedMinutes)} · {lessonStatusLabel(lesson.status)}</span>
          </span>
          <ChevronRight size={24} aria-hidden="true" />
        </Link>
      </li>)}</ol>
    </section> : null}
  </main>;
}
