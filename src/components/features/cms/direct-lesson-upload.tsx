"use client";

import { useEffect, useState } from "react";
import { uploadLessonResource } from "@/app/admin/content-actions";
import { FilePicker } from "@/components/ui/file-picker";

export type UploadedLessonFile = { id: string; title: string; fileName: string; mimeType: string; previewUrl?: string };
export function DirectLessonUpload({ moduleId, lessonId, kind = "file", label = "Subir archivo", imageTile, disabled, onUploaded, onBusyChange }: {
  moduleId: string; lessonId: string; kind?: "image" | "document" | "file"; label?: string; imageTile?: boolean; disabled?: boolean;
  onUploaded: (resource: UploadedLessonFile) => void | Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  return <div className="direct-upload" aria-busy={busy}>
    <FilePicker appearance={imageTile ? "image" : "button"} label={busy ? "Subiendo…" : label} disabled={disabled || busy} accept={kind === "document" ? "application/pdf" : kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "image/jpeg,image/png,image/webp,image/gif,application/pdf"} onChange={async (event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      setMessage("");
      if (file.size < 1 || file.size > 20 * 1024 * 1024) { setMessage("Elige un archivo de hasta 20 MB."); return; }
      setBusy(true);
      try {
        const data = new FormData(); data.set("module_id", moduleId); data.set("lesson_id", lessonId); data.set("file", file); data.set("title", file.name.replace(/\.[^.]+$/, "").trim() || file.name);
        const result = await uploadLessonResource(data);
        if (!result.ok) { setMessage(result.message); return; }
        await onUploaded(result.resource);
        setMessage("Archivo subido.");
      } catch { setMessage("No se pudo completar la subida. Inténtalo de nuevo."); }
      finally { setBusy(false); }
    }} />
    {message ? <p className="editor-note" role="status">{message}</p> : null}
  </div>;
}
