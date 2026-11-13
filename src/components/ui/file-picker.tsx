"use client";

import { useRef, type ComponentProps, type RefObject } from "react";
import { ImagePlus, Upload } from "lucide-react";

type Props = Omit<ComponentProps<"input">, "type" | "ref"> & { label?: string; appearance?: "button" | "image"; inputRef?: RefObject<HTMLInputElement | null> };

export function FilePicker({ label = "Subir archivo", appearance = "button", inputRef, disabled, ...props }: Props) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;
  return <div className={`direct-file-picker${appearance === "image" ? " image-upload-tile" : ""}`}>
    <input {...props} ref={ref} type="file" className="direct-file-input" disabled={disabled} aria-label={label} />
    <button type="button" className="direct-file-button" disabled={disabled} onClick={() => ref.current?.click()}>{appearance === "image" ? <ImagePlus size={36} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}{label}</button>
  </div>;
}
