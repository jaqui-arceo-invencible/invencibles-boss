import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isWebp } from "@/lib/content/webp";

export async function storeCoverImage(input: { teamId: string; userId: string; title: string; file: File }) {
  if (input.file.type !== "image/webp" || input.file.size < 1 || input.file.size > 4 * 1024 * 1024) {
    return { ok: false as const, message: "La portada tiene que ser una imagen WebP de hasta 4 MB." };
  }
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!isWebp(bytes)) return { ok: false as const, message: "No pudimos leer esa imagen." };
  const path = `${input.teamId}/${input.userId}/${crypto.randomUUID()}.webp`;
  const db = await createClient();
  const uploaded = await db.storage.from("academy-private").upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (uploaded.error) return { ok: false as const, message: "No pudimos subir la portada." };
  const title = input.title.trim().slice(0, 160) || "Portada";
  const { data, error } = await db.from("resources").insert({
    team_id: input.teamId,
    uploaded_by: input.userId,
    title: `Portada · ${title}`.slice(0, 180),
    file_name: input.file.name.slice(0, 255) || "portada.webp",
    storage_path: path,
    mime_type: "image/webp",
    file_size: bytes.byteLength,
  }).select("id").single();
  if (error || !data) {
    await createAdminClient().storage.from("academy-private").remove([path]);
    return { ok: false as const, message: "No pudimos guardar la portada." };
  }
  return { ok: true as const, id: data.id };
}
