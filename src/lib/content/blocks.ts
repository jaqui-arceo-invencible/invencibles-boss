export type BlockType = "rich_text" | "image" | "video" | "document" | "checklist" | "divider" | "callout";
export type BlockInput = { type: BlockType; content: Record<string, string>; position: number };
const types = new Set<BlockType>(["rich_text","image","video","document","checklist","divider","callout"]);
export function safeExternalLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url.toString() : null;
  } catch { return null; }
}
export function safeVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "www.youtube.com" && url.pathname === "/watch") {
      const id=url.searchParams.get("v"); return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname === "youtu.be") { const id=url.pathname.slice(1); return /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null; }
    if (url.hostname === "vimeo.com") { const id=url.pathname.slice(1); return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null; }
  } catch { return null; }
  return null;
}
export function parseBlocks(raw: string): BlockInput[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > 100) throw new Error("Bloques inválidos");
  return parsed.map((item,position) => {
    if (!item || typeof item !== "object") throw new Error("Bloque inválido");
    const b=item as Record<string,unknown>;
    if (typeof b.type !== "string" || !types.has(b.type as BlockType) || !b.content || typeof b.content !== "object") throw new Error("Tipo de bloque inválido");
    const content: Record<string,string>={};
    for (const [key,value] of Object.entries(b.content)) {
      if (typeof value !== "string" || value.length > 50000 || key.length > 50) throw new Error("Contenido inválido");
      content[key]=value;
    }
    if (b.type === "video" && !safeVideoUrl(content.url ?? "")) throw new Error("URL de video no permitida");
    if ((b.type === "image" || b.type === "document") && !/^[0-9a-f-]{36}$/.test(content.resourceId ?? "")) throw new Error("Recurso inválido");
    return {type:b.type as BlockType, content, position};
  });
}
