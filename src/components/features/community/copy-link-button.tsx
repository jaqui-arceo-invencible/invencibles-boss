"use client";

import { useState } from "react";
import { SecondaryButton } from "@/components/design/buttons";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return <SecondaryButton type="button" onClick={() => {
    const url = new URL(path, window.location.origin).toString();
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }}>{copied ? "Enlace copiado" : "Copiar enlace"}</SecondaryButton>;
}
