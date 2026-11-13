const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type CommunityTextPart = { kind: "text" | "link"; value: string };

export function plainCommunityText(value: string, max: number) {
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (trimmed.length < 1 || trimmed.length > max) return null;
  return trimmed;
}

export function categorySlug(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function communityImageExtension(type: string) {
  return imageExtensions[type] ?? null;
}

export function communityTextParts(text: string): CommunityTextPart[] {
  const pattern = /https:\/\/[^\s<>"']+/g;
  const parts: CommunityTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const raw = match[0] ?? "";
    if (index > last) parts.push({ kind: "text", value: text.slice(last, index) });
    const linked = raw.replace(/[),.;!?]+$/u, "");
    const trailing = raw.slice(linked.length);
    const safe = httpsLink(linked);
    parts.push(safe ? { kind: "link", value: safe } : { kind: "text", value: linked });
    if (trailing) parts.push({ kind: "text", value: trailing });
    last = index + raw.length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

function httpsLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url.toString() : null;
  } catch {
    return null;
  }
}
