export default function MemberLoading() {
  return <div className="admin-page" aria-busy="true" aria-label="Cargando">
    <div className="ds-skeleton ds-skeleton-title" />
    <div className="ds-skeleton ds-skeleton-card" />
    <div className="ds-skeleton ds-skeleton-card" />
  </div>;
}
