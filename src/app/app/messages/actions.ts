"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { plainCommunityText } from "@/lib/community/text";
import type { ActionState } from "@/lib/learning/action-state";
import { isUuid } from "@/lib/learning/progress";
import { orderParticipants } from "@/lib/messages/pair";
import { createClient } from "@/lib/supabase/server";

export async function startConversation(formData: FormData) {
  const access = await requireMember();
  const pair = orderParticipants(access.userId, String(formData.get("user_id") ?? ""));
  if (!pair) redirect("/app/messages/new?error=unavailable");
  const db = await createClient();
  const inserted = await db.from("conversations").insert({
    team_id: access.teamId,
    participant_low: pair.low,
    participant_high: pair.high,
  }).select("id").maybeSingle();
  const createdId = typeof inserted.data?.id === "string" ? inserted.data.id : "";
  if (isUuid(createdId)) redirect(`/app/messages/${createdId}`);
  const existing = await db.from("conversations").select("id").eq("team_id", access.teamId).eq("participant_low", pair.low).eq("participant_high", pair.high).maybeSingle();
  const existingId = typeof existing.data?.id === "string" ? existing.data.id : "";
  revalidatePath("/app/messages");
  redirect(isUuid(existingId) ? `/app/messages/${existingId}` : "/app/messages/new?error=unavailable");
}

export async function sendMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireMember();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const content = plainCommunityText(String(formData.get("content") ?? ""), 2000);
  if (!isUuid(conversationId) || !content) return { ok: false, message: "Escribe un mensaje de hasta 2000 caracteres." };
  const db = await createClient();
  const inserted = await db.from("direct_messages").insert({
    conversation_id: conversationId,
    team_id: access.teamId,
    sender_id: access.userId,
    content,
  });
  if (inserted.error) {
    const detail = inserted.error.message;
    if (detail.includes("rate_limited")) return { ok: false, message: "Espera un momento antes de enviar otro mensaje." };
    return { ok: false, message: "No pudimos enviar el mensaje." };
  }
  revalidatePath("/app/messages");
  revalidatePath(`/app/messages/${conversationId}`);
  return { ok: true, message: "sent" };
}

export async function deleteMessage(formData: FormData) {
  const access = await requireMember();
  const messageId = String(formData.get("message_id") ?? "");
  const conversationId = String(formData.get("conversation_id") ?? "");
  if (!isUuid(messageId)) return;
  const db = await createClient();
  await db.from("direct_messages").update({ deleted_at: new Date().toISOString() }).eq("id", messageId).eq("team_id", access.teamId).eq("sender_id", access.userId);
  revalidatePath("/app/messages");
  if (isUuid(conversationId)) revalidatePath(`/app/messages/${conversationId}`);
}

export async function markConversationRead(conversationId: string) {
  const access = await requireMember();
  if (!isUuid(conversationId)) return;
  const db = await createClient();
  await db.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", access.userId);
  revalidatePath("/app/messages");
}

export async function blockMember(formData: FormData) {
  const access = await requireMember();
  const userId = String(formData.get("user_id") ?? "");
  if (!isUuid(userId) || userId === access.userId) redirect("/app/messages");
  const db = await createClient();
  await db.from("user_blocks").insert({ team_id: access.teamId, blocker_id: access.userId, blocked_id: userId });
  revalidatePath("/app/messages");
  redirect("/app/messages/blocked");
}

export async function unblockMember(formData: FormData) {
  const access = await requireMember();
  const userId = String(formData.get("user_id") ?? "");
  if (!isUuid(userId)) redirect("/app/messages/blocked");
  const db = await createClient();
  await db.from("user_blocks").delete().eq("team_id", access.teamId).eq("blocker_id", access.userId).eq("blocked_id", userId);
  revalidatePath("/app/messages");
  redirect("/app/messages/blocked");
}
