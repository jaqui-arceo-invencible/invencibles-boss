"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { isUuid } from "@/lib/learning/progress";
import { createClient } from "@/lib/supabase/server";

export async function setReportStatus(formData: FormData) {
  const access = await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isUuid(reportId) || (status !== "resolved" && status !== "dismissed" && status !== "open")) return;
  const db = await createClient();
  await db.from("content_reports").update({
    status,
    resolved_by: status === "open" ? null : access.userId,
    resolved_at: status === "open" ? null : new Date().toISOString(),
  }).eq("id", reportId).eq("team_id", access.teamId);
  revalidatePath("/admin/community");
  revalidatePath(`/admin/community/${reportId}`);
}

export async function setContentVisibility(formData: FormData) {
  const access = await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  const contentId = String(formData.get("content_id") ?? "");
  const status = formData.get("status") === "hidden" ? "hidden" : "visible";
  if (!isUuid(contentId) || (kind !== "post" && kind !== "comment")) return;
  const db = await createClient();
  if (kind === "post") await db.from("community_posts").update({ status }).eq("id", contentId).eq("team_id", access.teamId);
  if (kind === "comment") await db.from("community_comments").update({ status }).eq("id", contentId).eq("team_id", access.teamId);
  revalidatePath("/admin/community");
  revalidatePath("/app/community");
}
