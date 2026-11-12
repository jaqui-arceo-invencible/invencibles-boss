"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { saveLesson, publishLesson } from "@/app/admin/content-actions";
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

export function LessonEditorClient(props: Props) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return <main className="admin-page editor-page">
    <Link href={`/admin/modules/${props.moduleId}`} onClick={event => { if (dirty && !window.confirm("Hay cambios sin guardar. ¿Salir del editor?")) event.preventDefault(); }}>← {props.moduleTitle}</Link>
    <header className="admin-page-heading"><div><span className="eyebrow">EDITOR · {props.lessonStatus === "published" ? "PUBLICADA" : "BORRADOR"}</span><h1>{props.lessonTitle}</h1><p role="status">{dirty ? "Cambios sin guardar" : props.flash.saved ? "Borrador guardado" : "Borrador listo para editar"}</p></div>
      <div className="editor-actions"><Link href={`/admin/modules/${props.moduleId}/lessons/${props.lessonId}/preview`} onClick={event => { if (dirty && !window.confirm("La vista previa muestra la última versión guardada. ¿Continuar?")) event.preventDefault(); }}>Vista previa ↗</Link><Button form="lesson-form" type="submit">Guardar borrador</Button>
        {props.canPublish && <form action={publishLesson} onSubmit={event => { if (dirty && !window.confirm("Hay cambios sin guardar. Se publicará el último borrador guardado. ¿Continuar?")) event.preventDefault(); }}><input type="hidden" name="module_id" value={props.moduleId}/><input type="hidden" name="lesson_id" value={props.lessonId}/><Button type="submit">Publicar borrador guardado</Button></form>}
      </div></header>
    {props.flash.saved && <p role="status" className="inline-success">Borrador guardado.</p>}{props.flash.published && <p role="status" className="inline-success">Lección publicada.</p>}{props.flash.error && <p role="alert" className="auth-error">{props.flash.error}</p>}
    <Card><CardContent className="editor-card"><form id="lesson-form" action={saveLesson} className="cms-form" onInput={() => setDirty(true)} onSubmit={() => setDirty(false)}><input type="hidden" name="module_id" value={props.moduleId}/><input type="hidden" name="lesson_id" value={props.lessonId}/><label>Título<input name="title" required maxLength={160} defaultValue={props.title}/></label><label>Resumen<textarea name="summary" rows={2} maxLength={1000} defaultValue={props.summary}/></label><label>Duración (minutos)<input name="estimated_minutes" type="number" min="1" max="1440" defaultValue={props.minutes}/></label><BlockComposer initial={props.blocks} resources={props.resources} onDirty={() => setDirty(true)}/><Button type="submit">Guardar borrador</Button></form></CardContent></Card>
  </main>;
}
