"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
import { createLesson } from "@/app/admin/content-actions";
import { PrimaryButton } from "@/components/design/buttons";

type LessonFormat = "text" | "video";

export function LessonCreateForm({ moduleId }: { moduleId: string }) {
  const [format, setFormat] = useState<LessonFormat>("text");

  return <Dialog.Root>
    <Dialog.Trigger render={<PrimaryButton type="button" className="lesson-create-trigger" />}>
      <Plus size={20} aria-hidden="true" /> Crear lección
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="lesson-dialog-backdrop" />
      <Dialog.Popup className="lesson-dialog" aria-describedby="new-lesson-description">
        <div className="lesson-dialog-heading">
          <div>
            <Dialog.Title>Nueva lección</Dialog.Title>
            <Dialog.Description id="new-lesson-description">Elige cómo quieres empezar. Podrás completar y editar el contenido después.</Dialog.Description>
          </div>
          <Dialog.Close className="lesson-dialog-close" aria-label="Cerrar"><X size={20} aria-hidden="true" /></Dialog.Close>
        </div>
        <form action={createLesson} className="cms-form lesson-create-form">
          <input type="hidden" name="module_id" value={moduleId} />
          <fieldset className="lesson-format-picker">
            <legend>Tipo de lección</legend>
            <label className={format === "video" ? "" : "is-selected"}>
              <input type="radio" name="lesson_format" value="text" checked={format === "text"} onChange={() => setFormat("text")} />
              <span>
                <strong>Lección en texto</strong>
                <small>Empieza con un título y añade bloques de contenido después.</small>
              </span>
            </label>
            <label className={format === "video" ? "is-selected" : ""}>
              <input type="radio" name="lesson_format" value="video" checked={format === "video"} onChange={() => setFormat("video")} />
              <span>
                <strong>Lección en video</strong>
                <small>Solo necesitas el enlace de YouTube o Vimeo para comenzar.</small>
              </span>
            </label>
          </fieldset>
          {format === "text" ? <label>Título<input name="title" required maxLength={160} placeholder="Ej. Tu primer día" autoFocus /></label> : <label>Enlace de video<input name="video_url" type="url" required placeholder="https://youtu.be/..." autoFocus /></label>}
          <PrimaryButton type="submit">{format === "video" ? "Crear lección en video" : "Crear lección en texto"}</PrimaryButton>
        </form>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
