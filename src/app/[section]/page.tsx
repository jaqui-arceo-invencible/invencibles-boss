import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

const sections: Record<string, { title: string; description: string }> = {
  academia: { title: "Mi academia", description: "Tu ruta de aprendizaje se está preparando. Muy pronto podrás avanzar por módulos y lecciones a tu ritmo." },
  recursos: { title: "Recursos", description: "Aquí estará tu biblioteca privada de materiales, guías y herramientas." },
  comunidad: { title: "Comunidad", description: "Un espacio para hacer preguntas, compartir experiencias y crecer juntas." },
  avances: { title: "Mis avances", description: "Sigue tu recorrido y celebra cada paso que completes." },
  perfil: { title: "Mi perfil", description: "Muy pronto podrás actualizar tus datos y preferencias." },
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function MemberSection({ params }: { params: Promise<{ section: string }> }) {
  const access = await requireMember();
  const { section } = await params;
  const content = sections[section];
  if (!content) notFound();
  return <AppShell mode="member" role={access.role} name={access.fullName}><div className="placeholder-page"><span className="eyebrow">TU ESPACIO</span><h1>{content.title}</h1><p>{content.description}</p><span className="coming-soon"><span /> Próximamente</span></div></AppShell>;
}
