"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { persistLessonDraft, publishLesson } from "@/app/admin/content-actions";
import { BlockComposer } from "@/components/features/cms/block-composer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BlockInput } from "@/lib/content/blocks";

type Props = {
  moduleId: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonStatus: string;
  canPublish: boolean;
  title: string;
  summary: string;
  minutes: number;
  blocks: BlockInput[];
  resources: { id: string; title: string; mime_type: string }[];
  flash: { saved?: string; published?: string; error?: string };
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function LessonEditorClient(props: Props) {
  const [title, setTitle] = useState(props.title);
  const [summary, setSummary] = useState(props.summary);
  const [minutes, setMinutes] = useState(String(props.minutes));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(props.flash.saved ? "saved" : "idle");
  const [message, setMessage] = useState(props.flash.error ?? "");
  const draft = useRef({ title: props.title, summary: props.summary, minutes: String(props.minutes), blocks: props.blocks });
  const saving = useRef(false);
  const queued = useRef(false);
  const timer = useRef<number | null>(null);

  function snapshot() {
    return draft.current;
  }

  async function saveNow() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    const current = snapshot();
    if (!current.title.trim()) {
      setStatus("error");
      setMessage("Escribe un título antes de guardar.");
      return;
    }
    if (saving.current) {
      queued.current = true;
      return;
    }
    saving.current = true;
    setStatus("saving");
    setMessage("");
    let result: { ok: true } | { ok: false; message: string };
    try {
      result = await persistLessonDraft({
        moduleId: props.moduleId,
        lessonId: props.lessonId,
        title: current.title,
        summary: current.summary,
        minutes: Number(current.minutes),
        blocksJson: JSON.stringify(current.blocks),
      });
    } catch (error) {
      saving.current = false;
      queued.current = false;
      if (typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw error;
      setStatus("error");
      setMessage("No se pudo guardar. Tus cambios siguen en esta página.");
      setDirty(true);
      return;
    }
    saving.current = false;
    if (queued.current) {
      queued.current = false;
      void saveNow();
      return;
    }
    if (!result.ok) {
      setStatus("error");
      setMessage(result.message);
      setDirty(true);
      return;
    }
    setStatus("saved");
    setDirty(false);
    setMessage("Guardado");
  }

  function schedule() {
    setDirty(true);
    setStatus((current) => current === "saving" ? current : "idle");
    setMessage("");
    if (saving.current) queued.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void saveNow(); }, 1200);
  }

  function editTitle(value: string) {
    draft.current = { ...draft.current, title: value };
    setTitle(value);
    schedule();
  }

  function editSummary(value: string) {
    draft.current = { ...draft.current, summary: value };
    setSummary(value);
    schedule();
  }

  function editMinutes(value: string) {
    draft.current = { ...draft.current, minutes: value };
    setMinutes(value);
    schedule();
  }

  function editBlocks(next: BlockInput[]) {
    draft.current = { ...draft.current, blocks: next };
    schedule();
  }

  useEffect(() => {
    if (!dirty && status !== "saving") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, status]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const statusText = status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? message || "No se pudo guardar. Tus cambios siguen en esta página." : dirty ? "Cambios sin guardar" : "Borrador listo para editar";
  const leave = (event: { preventDefault: () => void }) => {
    if ((dirty || status === "saving") && !window.confirm("Hay cambios sin guardar. ¿Salir del editor?")) event.preventDefault();
  };

  return <main className="admin-page editor-page">
    <Link href={`/admin/modules/${props.moduleId}`} onClick={leave}>← {props.moduleTitle}</Link>
    <header className="admin-page-heading"><div><span className="eyebrow">EDITOR · {props.lessonStatus === "published" ? "PUBLICADA" : "BORRADOR"}</span><h1>{title.trim() || props.lessonTitle}</h1><p role="status" aria-live="polite">{statusText}</p></div>
      <div className="editor-actions">
        <Link href={`/admin/modules/${props.moduleId}/lessons/${props.lessonId}/preview`} onClick={event => { if (dirty && !window.confirm("La vista previa muestra la última versión guardada. ¿Continuar?")) event.preventDefault(); }}>Vista previa ↗</Link>
        <Button type="button" onClick={() => { void saveNow(); }} disabled={status === "saving"}>Guardar ahora</Button>
        {props.canPublish && <form action={publishLesson} onSubmit={event => { if ((dirty || status === "saving" || status === "error") && !window.confirm("Se publicará el último borrador guardado. Los cambios que aún no se guardaron no entran. ¿Continuar?")) event.preventDefault(); }}><input type="hidden" name="module_id" value={props.moduleId}/><input type="hidden" name="lesson_id" value={props.lessonId}/><Button type="submit" disabled={status === "saving"}>Publicar borrador guardado</Button></form>}
      </div></header>
    {props.flash.published && <p role="status" className="inline-success">Lección publicada.</p>}
    {status === "error" && message && <p role="alert" className="auth-error">{message}</p>}
    <div className="editor-layout">
      <Card><CardContent className="editor-card"><BlockComposer initial={props.blocks} resources={props.resources} onChange={editBlocks} /></CardContent></Card>
      <Card className="editor-side-card"><CardContent className="editor-card editor-side"><form className="cms-form" onSubmit={event => { event.preventDefault(); void saveNow(); }}>
        <label>Título<input name="title" required maxLength={160} value={title} onChange={event => editTitle(event.target.value)} /></label>
        <label>Resumen<textarea name="summary" rows={3} maxLength={1000} value={summary} onChange={event => editSummary(event.target.value)} /></label>
        <label>Duración (minutos)<input name="estimated_minutes" type="number" min="1" max="1440" value={minutes} onChange={event => editMinutes(event.target.value)} /></label>
        <p className="editor-note">Los cambios se guardan solos al dejar de escribir. Si algo falla, el texto permanece en esta página.</p>
        <Button type="submit" disabled={status === "saving"}>Guardar ahora</Button>
      </form></CardContent></Card>
    </div>
  </main>;
}
