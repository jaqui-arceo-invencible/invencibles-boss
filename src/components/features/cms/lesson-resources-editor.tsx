"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { saveLessonResources } from "@/app/admin/content-actions";
import { DirectLessonUpload } from "@/components/features/cms/direct-lesson-upload";

type Resource = { id: string; title: string; fileName: string; mimeType: string };
export function LessonResourcesEditor({ moduleId, lessonId, resources, initialIds, onBusyChange }: {
  moduleId: string; lessonId: string; resources: Resource[]; initialIds: string[]; onBusyChange?: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState(() => initialIds.flatMap((id) => resources.filter((resource) => resource.id === id)));
  const [uploaded, setUploaded] = useState<Resource | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const busy = uploadBusy || saving;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  async function persist(next: Resource[]) {
    setSaving(true); setMessage("");
    try {
      const result = await saveLessonResources({ moduleId, lessonId, resourceIds: next.map((resource) => resource.id) });
      if (!result.ok) { setMessage(result.message); return false; }
      setSelected(next); return true;
    } catch { setMessage("No se pudieron guardar los archivos. Inténtalo de nuevo."); return false; }
    finally { setSaving(false); }
  }
  return <div className="lesson-resources-editor" aria-busy={busy}>
    <DirectLessonUpload moduleId={moduleId} lessonId={lessonId} disabled={saving || selected.length >= 20} onBusyChange={setUploadBusy} onUploaded={async (resource) => {
      setUploaded(resource);
      if (await persist([...selected, resource])) setUploaded(null);
    }} />
    {selected.length >= 20 ? <p className="editor-note">Puedes adjuntar hasta 20 archivos.</p> : null}
    {uploaded ? <button className="direct-file-button" type="button" disabled={busy} onClick={async () => { if (await persist([...selected, uploaded])) setUploaded(null); }}>Volver a adjuntar {uploaded.fileName}</button> : null}
    {selected.length ? <ul className="lesson-resource-list">{selected.map((resource) => <li key={resource.id}><FileText size={20} aria-hidden="true" /><span><strong>{resource.title}</strong><small>{resource.fileName}</small></span><button type="button" disabled={busy} aria-label={`Quitar ${resource.title}`} onClick={() => void persist(selected.filter((item) => item.id !== resource.id))}><X size={16} aria-hidden="true" /></button></li>)}</ul> : null}
    {message ? <p className="editor-note" role="status">{message}</p> : null}
  </div>;
}
