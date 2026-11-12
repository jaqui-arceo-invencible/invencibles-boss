import Link from "next/link";
import { BookOpen, Library, UserRound } from "lucide-react";
import { PrimaryButton } from "@/components/design/buttons";
import { SettingsLink, SettingsSection } from "@/components/design/settings-section";
import { ModuleCard } from "@/components/features/learning/module-card";
import { requireMember } from "@/lib/auth/guards";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { memberCopy } from "@/lib/learning/copy";
import { formatLearningDate, WELCOME_MODULE_SLUG } from "@/lib/learning/progress";

export const instant = false;

export default async function MemberDashboardPage() {
  const access = await requireMember();
  const learning = await loadLearningSnapshot(access);
  const name = access.fullName.trim();
  const initial = (name || "I").slice(0, 1).toLocaleUpperCase();
  const welcome = learning.modules.find((module) => module.slug === WELCOME_MODULE_SLUG);

  return <main className="admin-page">
    <header className="welcome-block">
      <span className="ds-profile-avatar" aria-hidden="true">{initial}</span>
      <div>
        <h1>{name ? memberCopy.greeting(name) : "¡Hola!"}</h1>
        <p>{memberCopy.subtitle}</p>
      </div>
    </header>
    {learning.withinWelcome && welcome ? <p className="welcome-note">{memberCopy.welcomeNote(formatLearningDate(learning.joinedAt))}</p> : null}
    <section className="stat-row" aria-label="Tu resumen">
      <article className="stat-card"><strong>{learning.modules.length}</strong><span>Módulos disponibles</span></article>
      <article className="stat-card"><strong>{learning.overall.completed}</strong><span>Lecciones completadas</span></article>
      <article className="stat-card"><strong>{learning.overall.percent}%</strong><span>Progreso general</span></article>
    </section>
    <article className="learn-card">
      <p className="learn-kicker">Continuar aprendiendo</p>
      {learning.continueHref ? <>
        <h2>{learning.continueLessonTitle}</h2>
        <p>{learning.continueModuleTitle}</p>
        <PrimaryButton render={<Link href={learning.continueHref} />}>{learning.hasStarted ? memberCopy.continueLearning : memberCopy.start}</PrimaryButton>
      </> : <p>{learning.modules.length ? memberCopy.completedAll : memberCopy.emptyAcademy}</p>}
    </article>
    <section>
      <h2 className="section-label">Mis módulos</h2>
      {learning.modules.length ? <div className="learn-grid">{learning.modules.map((module) => <ModuleCard key={module.id} href={`/app/academy/${module.slug}`} position={module.position} title={module.title} description={module.description} lessonCount={module.lessons.length} percent={module.progress.percent} state={module.progress.state} coverUrl={module.coverUrl} />)}</div> : <p className="empty-copy">{memberCopy.emptyAcademy}</p>}
    </section>
    <SettingsSection title="Accesos rápidos">
      <SettingsLink href="/app/resources" label="Mis recursos" detail="Guías y materiales de tus lecciones" icon={<Library size={24} />} />
      <SettingsLink href="/app/progress" label="Mis avances" detail="Lo que ya completaste y lo que sigue" icon={<BookOpen size={24} />} />
      <SettingsLink href="/app/profile" label="Mi perfil" detail="Nombre, imagen y contraseña" icon={<UserRound size={24} />} />
    </SettingsSection>
  </main>;
}
