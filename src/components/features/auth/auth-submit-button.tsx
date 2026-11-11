"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function AuthSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="auth-submit" disabled={pending}>{pending ? "Un momento…" : children}</Button>;
}
