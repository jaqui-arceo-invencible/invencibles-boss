import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
export default function SuspendedPage() { return <main className="auth-page"><section className="auth-card"><span className="eyebrow">CUENTA EN PAUSA</span><h1>Tu acceso está suspendido</h1><p>La administradora de tu equipo puede ayudarte a recuperar el acceso.</p><form action={signOut}><Button type="submit" variant="outline">Cerrar sesión</Button></form><Link href="mailto:soporte@invencibles-boss.com" className="auth-link">Contactar soporte</Link></section></main>; }
