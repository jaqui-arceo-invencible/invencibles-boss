import { notFound } from "next/navigation";
import { setContentVisibility, setReportStatus } from "@/app/admin/community/actions";
import { PageHeader } from "@/components/design/page-header";
import { PrimaryButton, SecondaryButton } from "@/components/design/buttons";
import { requireAdmin } from "@/lib/auth/guards";
import { loadReportDetail } from "@/lib/community/moderation";

export const instant = false;

const statusLabel: Record<string, string> = {
  open: "Abierto",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

export default async function AdminReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const access = await requireAdmin();
  const report = await loadReportDetail(access, reportId);
  if (!report) notFound();
  const contentKind = report.postId ? "post" : report.commentId ? "comment" : "";
  return <main className="admin-page">
    <PageHeader title="Reporte" backHref="/admin/community" />
    <article className="community-card">
      <p className="community-meta">{report.targetLabel} · {statusLabel[report.status] ?? report.status} · {report.when}</p>
      <p className="community-meta">Reportó {report.reporterName}</p>
      <h2 className="community-heading">Motivo</h2>
      <p className="community-body">{report.reason}</p>
      <h2 className="community-heading">Contenido</h2>
      <p className="community-body">{report.targetExcerpt}</p>
      {report.messageId ? <p className="form-hint">Solo se muestra el mensaje reportado.</p> : null}
    </article>
    <div className="community-actions">
      {report.status !== "resolved" ? <form action={setReportStatus}>
        <input type="hidden" name="report_id" value={report.id} />
        <input type="hidden" name="status" value="resolved" />
        <PrimaryButton type="submit">Marcar resuelto</PrimaryButton>
      </form> : null}
      {report.status !== "dismissed" ? <form action={setReportStatus}>
        <input type="hidden" name="report_id" value={report.id} />
        <input type="hidden" name="status" value="dismissed" />
        <SecondaryButton type="submit">Descartar</SecondaryButton>
      </form> : null}
      {contentKind && report.contentStatus ? <form action={setContentVisibility}>
        <input type="hidden" name="kind" value={contentKind} />
        <input type="hidden" name="content_id" value={report.postId || report.commentId} />
        <input type="hidden" name="status" value={report.contentStatus === "hidden" ? "visible" : "hidden"} />
        <button type="submit" className="ds-button ds-button-danger">{report.contentStatus === "hidden" ? "Restaurar" : "Ocultar"}</button>
      </form> : null}
    </div>
  </main>;
}
