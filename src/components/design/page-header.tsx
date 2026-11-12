import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return <header className="ds-page-header">
    {backHref ? <Link href={backHref} className="ds-icon-button" aria-label="Regresar"><ChevronLeft size={24} /></Link> : <span className="ds-icon-button" aria-hidden="true" />}
    <h1>{title}</h1>
    <div className="ds-page-header-action">{action ?? <span className="ds-icon-button" aria-hidden="true" />}</div>
  </header>;
}
