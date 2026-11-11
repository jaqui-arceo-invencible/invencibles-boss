import "server-only";
import { redirect } from "next/navigation";
import type { TeamRole } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export type AccessContext = {
  userId: string;
  email: string;
  teamId: string;
  role: TeamRole;
  fullName: string;
};

export async function getAccessContext(): Promise<AccessContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("team_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) return { userId: user.id, email: user.email ?? "", teamId: "", role: "member", fullName: "" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    teamId: membership.team_id,
    role: membership.role,
    fullName: profile?.full_name ?? user.user_metadata.full_name ?? "",
  };
}

export async function requireMember(): Promise<AccessContext> {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!context.teamId) redirect("/account-suspended");
  return context;
}

export async function requireAdmin(): Promise<AccessContext> {
  const context = await requireMember();
  if (context.role !== "admin") redirect("/unauthorized");
  return context;
}

export async function requireAdminOrEditor(): Promise<AccessContext> {
  const context = await requireMember();
  if (context.role === "member") redirect("/unauthorized");
  return context;
}
