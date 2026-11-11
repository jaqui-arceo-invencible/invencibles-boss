"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return <button type="button" className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }}><LogOut size={16} /></button>;
}
