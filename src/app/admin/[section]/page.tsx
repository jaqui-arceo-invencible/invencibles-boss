import { notFound } from "next/navigation";

const sections: Record<string, string> = {
  modulos: "Módulos y lecciones",
  recursos: "Biblioteca de recursos",
  usuarias: "Usuarias",
  invitaciones: "Invitaciones",
  comunidad: "Comunidad",
  estadisticas: "Estadísticas",
  configuracion: "Configuración",
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = sections[section];
  if (!title) notFound();
  return <div className="placeholder-page"><span className="eyebrow">ADMINISTRACIÓN</span><h1>{title}</h1><p>Esta sección queda planificada para la siguiente fase de implementación.</p><span className="coming-soon"><span /> Próximamente</span></div>;
}
