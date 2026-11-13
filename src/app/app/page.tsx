/* eslint-disable @next/next/no-img-element -- Private signed avatar URLs must not pass through a shared image optimizer cache. */
import Link from "next/link";
import { ArrowRight, BookOpen, Library, MessageSquare, Play, UserRound, Users } from "lucide-react";
import { PrimaryButton } from "@/components/design/buttons";
import { SettingsLink, SettingsSection } from "@/components/design/settings-section";
import { ModuleCard } from "@/components/features/learning/module-card";
import { requireMember } from "@/lib/auth/guards";
import { loadPinnedAnnouncement } from "@/lib/community/feed";
import { loadLearningSnapshot } from "@/lib/learning/catalog";
import { memberCopy } from "@/lib/learning/copy";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function MemberDashboardPage() {
  const access = await requireMember();
  const db = await createClient();
  const [learning, announcement, profileResult] = await Promise.all([
    loadLearningSnapshot(access),
    loadPinnedAnnouncement(access.teamId),
    db.from("profiles").select("avatar_path").eq("id", access.userId).maybeSingle(),
  ]);
  const name = access.fullName.trim();
  const initial = (name || "I").slice(0, 1).toLocaleUpperCase();
  const avatarPath = typeof profileResult.data?.avatar_path === "string" ? profileResult.data.avatar_path : "";
  const avatar = avatarPath.startsWith(`${access.teamId}/avatars/${access.userId}/`)
    ? await db.storage.from("academy-private").createSignedUrl(avatarPath, 300)
    : null;
  const avatarUrl = avatar?.data?.signedUrl ?? null;

  return <main className="admin-page member-dashboard">
    <header className="welcome-block">
      {avatarUrl ? <img className="ds-profile-avatar dashboard-avatar" src={avatarUrl} alt="" /> : <span className="ds-profile-avatar" aria-hidden="true">{initial}</span>}
      <div>
        <h1>{name ? memberCopy.greeting(name) : "¡Hola!"}</h1>
        <p>{memberCopy.subtitle}</p>
      </div>
    </header>
    <article className="learn-card continue-card">
      <span className="continue-card-icon" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
      {learning.continueHref ? <>
        <div className="continue-card-copy">
          <p className="learn-kicker">{learning.hasStarted ? "CONTINÚA A TU RITMO" : "TU PRIMER PASO"}</p>
          <h2>{learning.continueLessonTitle}</h2>
          <p>{learning.continueModuleTitle}</p>
        </div>
        <PrimaryButton render={<Link href={learning.continueHref} />}>{learning.hasStarted ? memberCopy.continueLearning : memberCopy.start}<ArrowRight size={18} aria-hidden="true" /></PrimaryButton>
      </> : <p>{learning.modules.length ? memberCopy.completedAll : memberCopy.emptyAcademy}</p>}
    </article>
    <section>
      <h2 className="section-label">Mis módulos</h2>
      {learning.modules.length ? <div className="learn-grid">{learning.modules.map((module) => <ModuleCard key={module.id} href={`/app/academy/${module.slug}`} position={module.position} title={module.title} description={module.description} lessonCount={module.lessons.length} minutes={module.lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0)} percent={module.progress.percent} state={module.progress.state} coverUrl={module.coverUrl} />)}</div> : <p className="empty-copy">{memberCopy.emptyAcademy}</p>}
    </section>
    {announcement ? <article className="learn-card">
      <p className="learn-kicker">Aviso del equipo</p>
      <p>{announcement.excerpt}</p>
      <PrimaryButton render={<Link href={`/app/community/${announcement.id}`} />}>Ver aviso</PrimaryButton>
    </article> : null}
    <SettingsSection title="Accesos rápidos">
      <SettingsLink href="/app/messages" label="Mensajes" detail="Conversaciones privadas del equipo" icon={<MessageSquare size={24} />} />
      <SettingsLink href="/app/community" label="Comunidad" detail="Preguntas, consejos y logros del equipo" icon={<Users size={24} />} />
      <SettingsLink href="/app/resources" label="Mis recursos" detail="Guías y materiales de tus lecciones" icon={<Library size={24} />} />
      <SettingsLink href="/app/progress" label="Mis avances" detail="Lo que ya completaste y lo que sigue" icon={<BookOpen size={24} />} />
      <SettingsLink href="/app/profile" label="Mi perfil" detail="Nombre, imagen y contraseña" icon={<UserRound size={24} />} />
    </SettingsSection>
  </main>;
}
