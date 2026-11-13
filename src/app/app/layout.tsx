import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { requireMember } from "@/lib/auth/guards";
import { countUnread } from "@/lib/notices/feed";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const access = await requireMember();
  const db = await createClient();
  const [unreadCount, profileResult] = await Promise.all([
    countUnread(),
    db.from("profiles").select("avatar_path").eq("id", access.userId).maybeSingle(),
  ]);
  const avatarPath = typeof profileResult.data?.avatar_path === "string" ? profileResult.data.avatar_path : "";
  const avatar = avatarPath.startsWith(`${access.teamId}/avatars/${access.userId}/`)
    ? await db.storage.from("academy-private").createSignedUrl(avatarPath, 300)
    : null;
  return <AppShell mode="member" role={access.role} name={access.fullName} avatarUrl={avatar?.data?.signedUrl ?? null} userId={access.userId} unreadCount={unreadCount}>{children}</AppShell>;
}
