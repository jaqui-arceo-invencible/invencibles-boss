import { PageHeader } from "@/components/design/page-header";
import { ModuleCard } from "@/components/features/learning/module-card";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { memberCopy } from "@/lib/learning/copy";

export const instant = false;

export default async function AcademyPage() {
  const access = await requireMember();
  const learning = await loadLearningSnapshot(access);
  return <main className="admin-page member-academy">
    <PageHeader title="Mi academia" backHref="/app" />
    <p className="ds-lead">Estas son las capacitaciones publicadas para ti.</p>
    {learning.modules.length ? <div className="learn-grid">{learning.modules.map((module) => <ModuleCard key={module.id} href={`/app/academy/${module.slug}`} position={module.position} title={module.title} description={module.description} lessonCount={module.lessons.length} minutes={module.lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0)} percent={module.progress.percent} state={module.progress.state} coverUrl={module.coverUrl} />)}</div> : <p className="empty-copy">{memberCopy.emptyAcademy}</p>}
  </main>;
}
