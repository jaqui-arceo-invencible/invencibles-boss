import { redirect } from "next/navigation";
import { completeOnboarding } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">TU PRIMER PASO</span><h1>Completa tu perfil</h1><p>Cuéntanos cómo te gusta que te llamemos.</p>{error && <p role="alert" className="auth-error">{error}</p>}<form action={completeOnboarding} className="auth-form"><label htmlFor="full_name">Nombre completo</label><Input id="full_name" name="full_name" defaultValue={user.user_metadata.full_name ?? ""} autoComplete="name" minLength={2} maxLength={100} required /><Button type="submit" className="auth-submit">Entrar a mi espacio</Button></form></section></main>;
}
