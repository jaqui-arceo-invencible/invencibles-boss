"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { completeLesson, recordLessonOpen } from "@/app/app/learning-actions";
import { PrimaryButton } from "@/components/design/buttons";

export function RecordLessonOpen({ lessonId, moduleSlug }: { lessonId: string; moduleSlug: string }) {
  useEffect(() => {
    void recordLessonOpen(lessonId, moduleSlug);
  }, [lessonId, moduleSlug]);
  return null;
}

export function CompleteLessonButton({ lessonId, completed, nextHref }: { lessonId: string; completed: boolean; nextHref: string | null }) {
  const [done, setDone] = useState(completed);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function markComplete() {
    if (done || pending) return;
    startTransition(async () => {
      const result = await completeLesson(lessonId);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setDone(true);
      setMessage(result.message);
    });
  }

  return <div className="lesson-complete">
    <PrimaryButton type="button" disabled={pending || done} onClick={markComplete}>{done ? "Completada" : pending ? "Guardando…" : "Marcar como completada"}</PrimaryButton>
    {message ? <p className="form-note" role="status">{message}</p> : null}
    {done && nextHref ? <Link href={nextHref} className="ds-button ds-button-secondary">Continuar con la siguiente lección</Link> : null}
  </div>;
}
