"use client";

import { checklistItems, newChecklistItemId, serializeChecklist, type ChecklistItem } from "@/lib/learning/progress";

export function ChecklistEditor({ title, items, onTitle, onItems }: { title: string; items: string; onTitle: (value: string) => void; onItems: (value: string) => void }) {
  const rows = checklistItems(items, true);
  function write(next: ChecklistItem[]) {
    onItems(serializeChecklist(next));
  }
  return <>
    <label>Título<input value={title} onChange={(event) => onTitle(event.target.value)} /></label>
    <div className="checklist-editor">
      {rows.map((item, index) => <div className="checklist-editor-row" key={item.id}>
        <span className="editable-check-box" aria-hidden="true" /><input aria-label={`Actividad ${index + 1}`} placeholder="Escribe una actividad…" value={item.text} onChange={(event) => write(rows.map((row, rowIndex) => rowIndex === index ? { ...row, text: event.target.value } : row))} />
        <button type="button" onClick={() => write(rows.filter((row) => row.id !== item.id))} aria-label={`Quitar actividad ${index + 1}`}>Quitar</button>
      </div>)}
      <button type="button" onClick={() => write([...rows, { id: newChecklistItemId(), text: "" }])}>Agregar actividad</button>
    </div>
  </>;
}
