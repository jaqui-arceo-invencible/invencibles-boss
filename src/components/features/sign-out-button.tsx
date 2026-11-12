"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ label }: { label?: string }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  if (label) return <button type="button" className="ds-button ds-button-secondary profile-signout" onClick={() => void signOut()}>{label}</button>;
  return <button type="button" className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void signOut()}><LogOut size={16} /></button>;
}
