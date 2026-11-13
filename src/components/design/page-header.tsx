import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title?: string;
  backHref?: string;
  action?: React.ReactNode;
  onBack?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function PageHeader({ title, backHref, action, onBack }: PageHeaderProps) {
  return <header className="ds-page-header">
    {backHref ? <Link href={backHref} className="ds-icon-button" aria-label="Regresar" onClick={onBack}><ChevronLeft size={24} /></Link> : <span className="ds-icon-button" aria-hidden="true" />}
    {title ? <h1>{title}</h1> : <span aria-hidden="true" />}
    <div className="ds-page-header-action">{action ?? <span className="ds-icon-button" aria-hidden="true" />}</div>
  </header>;
}
