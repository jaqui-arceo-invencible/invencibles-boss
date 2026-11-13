"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, CircleCheck, LoaderCircle } from "lucide-react";
import { completeLesson, recordLessonOpen } from "@/app/app/learning-actions";
import { PrimaryButton } from "@/components/design/buttons";

export function RecordLessonOpen({ lessonId, moduleSlug }: { lessonId: string; moduleSlug: string }) {
  useEffect(() => {
    void recordLessonOpen(lessonId, moduleSlug);
  }, [lessonId, moduleSlug]);
  return null;
}

export function CompleteLessonButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [done, setDone] = useState(completed);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function markComplete() {
    if (done || pending) return;
    startTransition(async () => {
      let result;
      try { result = await completeLesson(lessonId); }
      catch { setMessage("No se pudo guardar tu avance. Inténtalo de nuevo."); return; }
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setDone(true);
      setMessage(result.message);
    });
  }

  return <div className="lesson-complete">
    <PrimaryButton type="button" disabled={pending || done} onClick={markComplete}>{pending ? <LoaderCircle size={18} aria-hidden="true" /> : done ? <CircleCheck size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{done ? "Completada" : pending ? "Guardando…" : "Completar lección"}</PrimaryButton>
    {message ? <p className="form-note" role="status">{message}</p> : null}
  </div>;
}
