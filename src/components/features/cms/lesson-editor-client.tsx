"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, FileText, Save, Send, Video } from "lucide-react";
import { persistLessonDraft, saveAndPublishLesson } from "@/app/admin/content-actions";
import { PrimaryButton, SecondaryButton } from "@/components/design/buttons";
import { PageHeader } from "@/components/design/page-header";
import { SettingsSection } from "@/components/design/settings-section";
import { BlockComposer } from "@/components/features/cms/block-composer";
import { LessonCoverPicker } from "@/components/features/cms/lesson-cover-picker";
import { LessonResourcesEditor } from "@/components/features/cms/lesson-resources-editor";
import { safeVideoUrl, type BlockInput } from "@/lib/content/blocks";
import { prepareDraftBlocks } from "@/lib/content/lesson-draft";

type Props = {
  moduleId: string; lessonId: string; moduleTitle: string; lessonTitle: string;
  lessonStatus: string; canPublish: boolean; title: string; summary: string; minutes: number;
  lessonFormat: "text" | "video"; videoUrl: string; coverUrl: string | null; coverResourceId: string | null;
  blocks: BlockInput[]; resources: { id: string; title: string; mime_type: string; previewUrl?: string }[];
  downloadableResources: { id: string; title: string; fileName: string; mimeType: string }[];
  downloadResourceIds: string[]; flash: { saved?: string; published?: string; error?: string }; children?: React.ReactNode;
};
const steps = ["Tipo", "Datos y portada", "Contenido", "Revisar y guardar"];

export function LessonEditorClient(props: Props) {
  const router = useRouter();
  const submitting = useRef(false);
  const [isPublished, setIsPublished] = useState(props.lessonStatus === "published");
  const [step, setStep] = useState(0);
  const [format, setFormat] = useState(props.lessonFormat);
  const [title, setTitle] = useState(props.title);
  const [summary, setSummary] = useState(props.summary);
  const [minutes, setMinutes] = useState(String(props.minutes));
  const [videoUrl, setVideoUrl] = useState(props.videoUrl);
  const [blocks, setBlocks] = useState(props.blocks);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [resourcesBusy, setResourcesBusy] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [message, setMessage] = useState(props.flash.error ?? "");
  const [error, setError] = useState(Boolean(props.flash.error));
  const draft = useRef({ title: props.title, summary: props.summary, minutes: String(props.minutes), format: props.lessonFormat, videoUrl: props.videoUrl, coverResourceId: props.coverResourceId, blocks: props.blocks });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const locked = busy || coverBusy || resourcesBusy || contentBusy;
  const markDirty = () => { setDirty(true); setMessage(""); setError(false); };
  const changeStep = (next: number) => { setStep(next); requestAnimationFrame(() => headingRef.current?.focus()); };

  useEffect(() => {
    if (!dirty && !locked) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, locked]);

  function validate() {
    if (!draft.current.title.trim()) { setMessage("Escribe un título para tu lección."); setError(true); changeStep(1); return false; }
    const duration = Number(draft.current.minutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) { setMessage("La duración debe ser un número entero entre 1 y 1440 minutos."); setError(true); changeStep(1); return false; }
    if (draft.current.format === "video" && !safeVideoUrl(draft.current.videoUrl)) { setMessage("Agrega un enlace válido de YouTube o Vimeo."); setError(true); changeStep(2); return false; }
    return true;
  }

  async function saveDraft(publish = false) {
    if (!validate()) return false;
    const current = draft.current;
    try {
      const action = publish ? saveAndPublishLesson : persistLessonDraft;
      const result = await action({ moduleId: props.moduleId, lessonId: props.lessonId, title: current.title, summary: current.summary, minutes: Number(current.minutes), lessonFormat: current.format, videoUrl: current.videoUrl, coverResourceId: current.coverResourceId, blocksJson: JSON.stringify(current.format === "video" ? [] : prepareDraftBlocks(current.blocks)) });
      if (!result.ok) { setMessage(result.message); setError(true); return false; }
      setDirty(false); setError(false); if (publish) setIsPublished(true);
      setMessage(publish ? "Lección publicada y actualizada." : "Borrador guardado.");
      router.refresh(); return true;
    } catch (cause) {
      if (typeof cause === "object" && cause !== null && "digest" in cause && String(cause.digest).startsWith("NEXT_REDIRECT")) throw cause;
      setMessage("No se pudo guardar. Tus cambios siguen aquí; inténtalo de nuevo."); setError(true); return false;
    }
  }

  async function finish(intent: "draft" | "publish") {
    if (submitting.current || locked) return;
    submitting.current = true;
    setBusy(true); setMessage("");
    try {
      await saveDraft(intent === "publish");
    } catch (cause) {
      if (typeof cause === "object" && cause !== null && "digest" in cause && String(cause.digest).startsWith("NEXT_REDIRECT")) throw cause;
      setMessage("El borrador está guardado, pero no se pudo publicar. Inténtalo de nuevo."); setError(true);
    } finally { submitting.current = false; setBusy(false); }
  }

  function selectFormat(next: "text" | "video") {
    if (next === format) return;
    if (next === "video" && draft.current.blocks.length && !window.confirm("Al guardar como video, el borrador se guardará sin los bloques de texto. Puedes volver a Texto antes de guardar para conservarlos. ¿Cambiar a video?")) return;
    draft.current.format = next; setFormat(next); markDirty();
  }

  return <main className="admin-page lesson-editor lesson-wizard">
    <PageHeader title="Editar lección" backHref={`/admin/modules/${props.moduleId}`} onBack={(event) => { if ((dirty || locked) && !window.confirm("Hay cambios pendientes. ¿Salir del editor?")) event.preventDefault(); }} />
    <p className="ds-lead">{props.moduleTitle}</p>
    <nav aria-label="Pasos de edición"><ol className="wizard-steps">{steps.map((label, index) => <li key={label}><button type="button" disabled={locked} aria-current={step === index ? "step" : undefined} onClick={() => changeStep(index)}><span>{step > index ? <Check size={16} aria-hidden="true" /> : index + 1}</span>{label}</button></li>)}</ol></nav>
    <div className="wizard-step-heading"><p>Paso {step + 1} de 4</p><h2 ref={headingRef} tabIndex={-1}>{steps[step]}</h2></div>
    {message ? <p className={error ? "auth-error" : "inline-success"} role={error ? "alert" : "status"}>{message}</p> : null}
    {props.flash.published && !dirty ? <p className="inline-success" role="status">La lección se publicó correctamente.</p> : null}
    <div hidden={step !== 0} className="wizard-panel">
      <p>¿Cómo aprenderán las socias en esta lección?</p>
      <fieldset className="wizard-format"><legend className="sr-only">Tipo de lección</legend>{(["text", "video"] as const).map((value) => <label key={value} className={format === value ? "is-selected" : ""}><input type="radio" name="editor-format" value={value} checked={format === value} onChange={() => selectFormat(value)} />{value === "text" ? <FileText size={26} aria-hidden="true" /> : <Video size={26} aria-hidden="true" />}<strong>{value === "text" ? "Lección en texto" : "Lección en video"}</strong><span>{value === "text" ? "Escribe y combina texto, avisos y actividades." : "Agrega un video de YouTube o Vimeo y su descripción."}</span></label>)}</fieldset>
    </div>
    <div hidden={step !== 1} className="wizard-panel">
      <SettingsSection title="Datos básicos"><div className="cms-form"><label>Título de la lección<input required maxLength={160} value={title} onChange={(event) => { draft.current.title = event.target.value; setTitle(event.target.value); markDirty(); }} placeholder="¿Qué van a aprender?" /></label><label>Descripción<textarea rows={4} maxLength={1000} value={summary} onChange={(event) => { draft.current.summary = event.target.value; setSummary(event.target.value); markDirty(); }} placeholder="Explica qué se llevarán de esta lección." /></label><label>Tiempo estimado en minutos<input type="number" min={1} max={1440} value={minutes} onChange={(event) => { draft.current.minutes = event.target.value; setMinutes(event.target.value); markDirty(); }} /></label></div></SettingsSection>
      <details className="admin-disclosure" open={props.coverUrl ? true : undefined}><summary>Portada (opcional)</summary><div className="admin-disclosure-body"><LessonCoverPicker moduleId={props.moduleId} lessonId={props.lessonId} currentUrl={props.coverUrl} onBusyChange={setCoverBusy} onSaved={(id) => { draft.current.coverResourceId = id; markDirty(); }} /></div></details>
    </div>
    <div hidden={step !== 2} className="wizard-panel">
      {format === "text" ? <SettingsSection title="Construye tu lección"><BlockComposer moduleId={props.moduleId} lessonId={props.lessonId} onBusyChange={setContentBusy} initial={blocks} resources={props.resources} onChange={(next) => { draft.current.blocks = next; setBlocks(next); markDirty(); }} /></SettingsSection> : <SettingsSection title="Video de la lección"><div className="cms-form"><label>Enlace de YouTube o Vimeo<input type="url" value={videoUrl} placeholder="https://www.youtube.com/watch?v=…" onChange={(event) => { draft.current.videoUrl = event.target.value; setVideoUrl(event.target.value); markDirty(); }} /></label>{safeVideoUrl(videoUrl) ? <div className="video-frame"><iframe src={safeVideoUrl(videoUrl) ?? ""} title="Vista previa del video de la lección" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <p className="editor-note">Pega un enlace válido para ver el reproductor aquí.</p>}</div></SettingsSection>}
      <div className="simple-attachments"><h3>Archivos para descargar</h3><LessonResourcesEditor moduleId={props.moduleId} lessonId={props.lessonId} resources={props.downloadableResources} initialIds={props.downloadResourceIds} onBusyChange={setResourcesBusy} /></div>
    </div>
    <div hidden={step !== 3} className="wizard-panel">
      <div className="wizard-review"><span className="status-badge">{isPublished ? "Publicada · editando borrador" : "Borrador"}</span><h3>{title || "Falta el título"}</h3><p>{summary || "Sin descripción"}</p><p className="editor-note">{format === "video" ? "Video" : `Texto · ${blocks.length} bloques`} · {minutes} min</p><Link className="lesson-preview-button" href={`/admin/modules/${props.moduleId}/lessons/${props.lessonId}/preview`} onClick={(event) => { if (dirty && !window.confirm("La vista previa muestra lo guardado. Guarda el borrador para revisar estos cambios. ¿Abrir?")) event.preventDefault(); }}><Eye size={18} aria-hidden="true" />Ver versión guardada</Link></div>
      {props.children ? <details className="admin-disclosure"><summary>Opciones de comentarios</summary><div className="admin-disclosure-body">{props.children}</div></details> : null}
    </div>
    <footer className="wizard-footer">{message ? <p className={`wizard-action-feedback ${error ? "auth-error" : "inline-success"}`} role={error ? "alert" : "status"}>{message}</p> : null}<SecondaryButton type="button" disabled={step === 0 || locked} onClick={() => changeStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Anterior</SecondaryButton>{step < 3 ? <PrimaryButton type="button" disabled={locked} onClick={() => { if (step === 1 && (!title.trim() || !Number.isInteger(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 1440)) { setMessage("Revisa el título y la duración antes de continuar."); setError(true); return; } changeStep(step + 1); }}>Continuar<ArrowRight size={16} aria-hidden="true" /></PrimaryButton> : <form action={() => finish("draft")} className="wizard-finish"><input type="hidden" name="module_id" value={props.moduleId} /><input type="hidden" name="lesson_id" value={props.lessonId} /><SecondaryButton type="submit" disabled={locked}><Save size={18} aria-hidden="true" />{busy ? "Guardando…" : "Guardar borrador"}</SecondaryButton>{props.canPublish ? <PrimaryButton type="submit" formAction={() => finish("publish")} disabled={locked}><Send size={18} aria-hidden="true" />{busy ? "Guardando…" : isPublished ? "Actualizar lección" : "Publicar lección"}</PrimaryButton> : null}</form>}</footer>
  </main>;
}
