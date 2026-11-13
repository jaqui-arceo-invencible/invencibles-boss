"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
import { PrimaryButton } from "@/components/design/buttons";

export function AdminDialog({ label, title, description, children }: { label: string; title: string; description: string; children: React.ReactNode }) {
  return <Dialog.Root>
    <Dialog.Trigger render={<PrimaryButton type="button" />}><Plus size={18} aria-hidden="true" />{label}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="lesson-dialog-backdrop" />
      <Dialog.Popup className="lesson-dialog admin-dialog">
        <div className="lesson-dialog-heading">
          <div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div>
          <Dialog.Close className="lesson-dialog-close" aria-label="Cerrar"><X size={20} aria-hidden="true" /></Dialog.Close>
        </div>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
