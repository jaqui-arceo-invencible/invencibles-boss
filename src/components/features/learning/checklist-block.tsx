"use client";

import { useState, useTransition } from "react";
import { setChecklistItem } from "@/app/app/learning-actions";
import type { ChecklistItem } from "@/lib/learning/progress";

export function ChecklistBlock({ lessonId, blockId, title, items, completedItemIds }: { lessonId: string; blockId: string; title: string; items: ChecklistItem[]; completedItemIds: string[] }) {
  const visible = items.filter((item) => item.text.trim());
  const [done, setDone] = useState(() => new Set(completedItemIds));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(itemId: string, next: boolean) {
    const previous = new Set(done);
    const optimistic = new Set(done);
    if (next) optimistic.add(itemId);
    else optimistic.delete(itemId);
    setDone(optimistic);
    setMessage("");
    startTransition(async () => {
      const result = await setChecklistItem(lessonId, blockId, itemId, next);
      if (!result.ok) {
        setDone(previous);
        setMessage(result.message);
        return;
      }
      setMessage(result.message);
    });
  }

  return <section className="lesson-block">
    {title ? <h2>{title}</h2> : null}
    <ul className="checklist-live">
      {visible.map((item) => <li key={item.id}>
        <label>
          <input type="checkbox" checked={done.has(item.id)} disabled={pending} onChange={(event) => toggle(item.id, event.target.checked)} />
          <span>{item.text}</span>
        </label>
      </li>)}
    </ul>
    {message ? <p className="form-note" role="status">{message}</p> : null}
  </section>;
}
