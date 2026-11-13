/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import { connection } from "next/server";
import { PageHeader } from "@/components/design/page-header";
import { SettingsField } from "@/components/design/settings-field";
import { ProfileForm } from "@/components/features/learning/profile-form";
import { requireMember } from "@/lib/auth/guards";
import { formatLearningDate } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types/database";

export const instant = false;

function roleLabel(role: TeamRole) {
  if (role === "admin") return "Administradora";
  if (role === "editor") return "Editora";
  return "Socia";
}

export default async function MemberProfilePage() {
  const access = await requireMember();
  await connection();
  const db = await createClient();
  const [{ data: profile }, { data: membership }, { data: team }] = await Promise.all([
    db.from("profiles").select("full_name,avatar_path,directory_visible").eq("id", access.userId).maybeSingle(),
    db.from("memberships").select("joined_at").eq("user_id", access.userId).eq("team_id", access.teamId).eq("status", "active").maybeSingle(),
    db.from("teams").select("name").eq("id", access.teamId).maybeSingle(),
  ]);
  const name = (typeof profile?.full_name === "string" && profile.full_name.trim()) || access.fullName || "";
  const avatarPath = typeof profile?.avatar_path === "string" ? profile.avatar_path : "";
  const avatar = avatarPath.startsWith(`${access.teamId}/`) ? await db.storage.from("academy-private").createSignedUrl(avatarPath, 300) : null;
  const joinedAt = typeof membership?.joined_at === "string" ? membership.joined_at : null;

  return <main className="admin-page">
    <PageHeader title="Mi perfil" backHref="/app" />
    {avatar?.data?.signedUrl ? <img className="profile-photo" src={avatar.data.signedUrl} alt="" /> : <span className="ds-profile-avatar profile-photo-fallback" aria-hidden="true">{(name || "S").slice(0, 1).toLocaleUpperCase()}</span>}
    <SettingsField label="Correo" value={access.email || "Sin correo"} hint="El correo se cambia solo con una verificación de identidad. Esta pantalla no lo modifica." />
    <SettingsField label="Fecha de incorporación" value={formatLearningDate(joinedAt)} hint="Es la fecha en que entraste a este equipo." />
    <SettingsField label="Equipo" value={typeof team?.name === "string" ? team.name : "Invencibles Boss"} hint="El equipo lo asigna la administración." />
    <SettingsField label="Rol" value={roleLabel(access.role)} hint="El rol no se cambia desde el perfil." />
    <ProfileForm name={name} avatarUrl={avatar?.data?.signedUrl ?? ""} directoryVisible={profile?.directory_visible !== false} />
  </main>;
}
