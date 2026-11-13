"use client";
/* eslint-disable @next/next/no-img-element -- The preview is a local blob or a short-lived signed URL. */

import { useEffect, useRef, useState } from "react";
import { fileToCoverWebp } from "@/lib/content/webp";
import { FilePicker } from "@/components/ui/file-picker";

type Phase = "idle" | "converting" | "uploading";

export function CoverPicker({ currentUrl }: { currentUrl: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const previewUrl = useRef<string | null>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [message, setMessage] = useState("");
  const [remove, setRemove] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const onSubmit = () => {
      const input = form.querySelector<HTMLInputElement>("input[name='cover']");
      if (input?.files?.length) setPhase("uploading");
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  async function onFile(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    setPhase("converting");
    setMessage("");
    setRemove(false);
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    try {
      const webp = await fileToCoverWebp(file);
      const transfer = new DataTransfer();
      transfer.items.add(webp);
      input.files = transfer.files;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      const nextUrl = URL.createObjectURL(webp);
      previewUrl.current = nextUrl;
      setPreview(nextUrl);
      setMessage("");
      setPhase("idle");
    } catch (error) {
      input.value = "";
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "No pudimos preparar la imagen.");
    }
  }

  const busyLabel = phase === "uploading" ? "Subiendo la portada…" : "Preparando la imagen…";

  return <div className="cover-picker" ref={root} aria-busy={phase !== "idle"}>
    {phase !== "idle" ? <div className="cover-busy" role="status">
      <span className="cover-spinner" aria-hidden="true" />
      <span>{busyLabel}</span>
    </div> : preview && !remove ? <img src={preview} alt="" /> : null}
    <FilePicker appearance={preview && !remove ? "button" : "image"} label={preview && !remove ? "Cambiar imagen" : "Subir imagen"} name="cover" accept="image/jpeg,image/png,image/webp" disabled={phase !== "idle"} onChange={(event) => void onFile(event.target.files?.[0], event.target)} />
    {currentUrl ? <label className="cover-remove"><input type="checkbox" name="remove_cover" value="1" checked={remove} disabled={phase !== "idle"} onChange={(event) => setRemove(event.target.checked)} /> Quitar la portada actual</label> : null}
    {message && phase === "idle" ? <p role="status" className="editor-note">{message}</p> : null}
  </div>;
}
