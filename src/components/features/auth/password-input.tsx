"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordInput({ id = "password", name = "password", autoComplete, minLength, maxLength, value, onChange }: { id?: string; name?: string; autoComplete?: string; minLength?: number; maxLength?: number; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-input-wrap"><Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} value={value} onChange={onChange} required />
    <button className="password-visibility" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}><span>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</span></button>
  </div>;
}
