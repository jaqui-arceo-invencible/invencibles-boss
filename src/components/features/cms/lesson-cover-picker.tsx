"use client";
/* eslint-disable @next/next/no-img-element -- The preview is a local blob or a short-lived signed URL. */

import { useEffect, useRef, useState } from "react";
import { removeLessonCover, saveLessonCover } from "@/app/admin/content-actions";
import { fileToCoverWebp } from "@/lib/content/webp";
import { FilePicker } from "@/components/ui/file-picker";

type Phase = "idle" | "converting" | "uploading";

export function LessonCoverPicker({ moduleId, lessonId, currentUrl, onSaved, onBusyChange }: {
  moduleId: string;
  lessonId: string;
  currentUrl: string | null;
  onSaved: (resourceId: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const previewUrl = useRef<string | null>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  useEffect(() => { onBusyChange?.(phase !== "idle"); }, [phase, onBusyChange]);

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  async function onFile(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    setPhase("converting");
    setMessage("");
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    try {
      const webp = await fileToCoverWebp(file);
      setPhase("uploading");
      const formData = new FormData();
      formData.set("module_id", moduleId);
      formData.set("lesson_id", lessonId);
      formData.set("cover", webp);
      const result = await saveLessonCover(formData);
      input.value = "";
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      const nextUrl = URL.createObjectURL(webp);
      previewUrl.current = nextUrl;
      setPreview(nextUrl);
      onSaved(result.id);
      setMessage("");
    } catch (error) {
      input.value = "";
      setMessage(error instanceof Error ? error.message : "No pudimos preparar la imagen.");
    } finally {
      setPhase("idle");
    }
  }

  async function removeCover() {
    setPhase("uploading");
    setMessage("");
    const result = await removeLessonCover({ moduleId, lessonId });
    setPhase("idle");
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
    onSaved(null);
    setMessage("Portada quitada.");
  }

  const busyLabel = phase === "uploading" ? "Subiendo la portada…" : "Preparando la imagen…";

  return <div className="cover-picker" aria-busy={phase !== "idle"}>
    {phase !== "idle" ? <div className="cover-busy" role="status">
      <span className="cover-spinner" aria-hidden="true" />
      <span>{busyLabel}</span>
    </div> : preview ? <img src={preview} alt="" /> : null}
    <FilePicker appearance={preview ? "button" : "image"} label={preview ? "Cambiar imagen" : "Subir imagen"} accept="image/jpeg,image/png,image/webp" disabled={phase !== "idle"} onChange={(event) => void onFile(event.target.files?.[0], event.target)} />
    {preview ? <button className="cover-remove-button" type="button" disabled={phase !== "idle"} onClick={() => void removeCover()}>Quitar portada</button> : null}
    {message && phase === "idle" ? <p role="status" className="editor-note">{message}</p> : null}
  </div>;
}
