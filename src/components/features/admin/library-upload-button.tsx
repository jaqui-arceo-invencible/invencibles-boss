"use client";

import { useRef, useState } from "react";
import { FilePicker } from "@/components/ui/file-picker";

export function LibraryUploadButton() {
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form ref={form} action="/admin/library/upload" method="post" encType="multipart/form-data" onSubmit={() => setBusy(true)}>
    <input ref={title} type="hidden" name="title" />
    <FilePicker name="file" label={busy ? "Subiendo…" : "Subir archivo"} disabled={busy} accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={(event) => {
      const file = event.currentTarget.files?.[0]; if (!file || !title.current) return;
      if (file.size < 1 || file.size > 20 * 1024 * 1024) { setMessage("Elige un archivo de hasta 20 MB."); event.currentTarget.value = ""; return; }
      title.current.value = file.name.replace(/\.[^.]+$/, "").trim() || file.name;
      form.current?.requestSubmit();
    }} />
    {message ? <p role="status" className="editor-note">{message}</p> : null}
  </form>;
}
