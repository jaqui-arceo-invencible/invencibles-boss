import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"], ["application/pdf", "pdf"]]);
function matchesMagic(type:string, bytes:Uint8Array) {
  const ascii=(from:number,to:number)=>String.fromCharCode(...bytes.slice(from,to));
  switch(type){
    case "image/jpeg":return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
    case "image/png":return ascii(1,4)==="PNG";
    case "image/webp":return ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP";
    case "image/gif":return ascii(0,3)==="GIF";
    case "application/pdf":return ascii(0,5)==="%PDF-";
    default:return false;
  }
}
export async function POST(request: Request) {
  const access = await getAccessContext();
  if (!access?.teamId || access.role === "member") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const data = await request.formData();
  const file = data.get("file");
  const title = String(data.get("title") ?? "").trim().slice(0, 180);
  if (!(file instanceof File) || !allowed.has(file.type) || file.size < 1 || file.size > 20 * 1024 * 1024 || !title) {
    return NextResponse.redirect(new URL("/admin/library?error=Archivo%20no%20válido", request.url), 303);
  }
  if (!matchesMagic(file.type,new Uint8Array(await file.slice(0,16).arrayBuffer()))) return NextResponse.redirect(new URL("/admin/library?error=El%20archivo%20no%20coincide%20con%20su%20formato",request.url),303);
  const extension = allowed.get(file.type);
  const path = `${access.teamId}/${access.userId}/${crypto.randomUUID()}.${extension}`;
  const db = await createClient();
  const { error: uploadError } = await db.storage.from("academy-private").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.redirect(new URL("/admin/library?error=No%20se%20pudo%20subir", request.url), 303);
  const { error } = await db.from("resources").insert({ team_id: access.teamId, uploaded_by: access.userId, title, file_name: file.name.slice(0, 255), storage_path: path, mime_type: file.type, file_size: file.size });
  if (error) {
    await createAdminClient().storage.from("academy-private").remove([path]);
    return NextResponse.redirect(new URL("/admin/library?error=No%20se%20pudo%20guardar", request.url), 303);
  }
  return NextResponse.redirect(new URL("/admin/library?uploaded=1", request.url), 303);
}
