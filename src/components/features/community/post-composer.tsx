"use client";

/* eslint-disable @next/next/no-img-element -- Local previews are object URLs, not optimized remote images. */
import { useActionState, useRef, useState } from "react";
import { createPost } from "@/app/app/community/actions";
import { PrimaryButton } from "@/components/design/buttons";
import { FilePicker } from "@/components/ui/file-picker";
import type { CommunityCategory } from "@/lib/community/feed";
import type { ActionState } from "@/lib/learning/action-state";

const idle: ActionState = { ok: true, message: "" };

export function PostComposer({ categories, isAdmin = false }: { categories: CommunityCategory[]; isAdmin?: boolean }) {
  const [state, action, pending] = useActionState(createPost, idle);
  const [previews, setPreviews] = useState<string[]>([]);
  const filesRef = useRef<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const syncing = useRef(false);

  function replaceFiles(next: File[]) {
    const limited = next.slice(0, 4);
    filesRef.current = limited;
    setPreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return limited.map((file) => URL.createObjectURL(file));
    });
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    limited.forEach((file) => transfer.items.add(file));
    syncing.current = true;
    inputRef.current.files = transfer.files;
    queueMicrotask(() => { syncing.current = false; });
  }

  return <form className="ds-form community-form" action={action}>
    <label>Categoría
      <select name="category_id" required defaultValue={categories[0]?.id ?? ""}>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </label>
    <label>Publicación
      <textarea name="content" required minLength={1} maxLength={4000} rows={6} placeholder="Comparte una pregunta, un consejo o un logro" />
    </label>
      <FilePicker label="Subir imágenes" inputRef={inputRef} name="images" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
        if (syncing.current) return;
        const picked = event.target.files ? [...event.target.files] : [];
        replaceFiles([...filesRef.current, ...picked]);
      }} />
    <p className="form-hint">Hasta 4 imágenes JPG, PNG o WebP. Menos de 5 MB cada una.</p>
    {isAdmin ? <label className="community-check"><input type="checkbox" name="pinned" /> Fijar como aviso del equipo</label> : null}
    {previews.length ? <div className="community-previews">{previews.map((url, index) => <figure key={url}>
      <img src={url} alt="" />
      <button type="button" onClick={() => replaceFiles(filesRef.current.filter((_, item) => item !== index))}>Quitar</button>
    </figure>)}</div> : null}
    <PrimaryButton type="submit" disabled={pending || categories.length === 0}>{pending ? "Publicando…" : "Publicar"}</PrimaryButton>
    {state.message ? <p className="form-note" role="status">{state.message}</p> : null}
  </form>;
}
