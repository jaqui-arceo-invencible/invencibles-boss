"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { isUuid } from "@/lib/learning/progress";
import { noticeDestination } from "@/lib/notices/feed";
import { createClient } from "@/lib/supabase/server";

export async function openNotification(formData: FormData) {
  const access = await requireMember();
  const noticeId = String(formData.get("notification_id") ?? "");
  if (!isUuid(noticeId)) redirect("/app/notifications");
  const db = await createClient();
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", noticeId).is("read_at", null);
  const destination = await noticeDestination(access, noticeId);
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
  redirect(destination ?? "/app/notifications");
}

export async function markAllNotificationsRead() {
  const access = await requireMember();
  const db = await createClient();
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", access.userId).is("read_at", null);
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
}
