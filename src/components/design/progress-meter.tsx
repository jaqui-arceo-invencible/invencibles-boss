export function ProgressMeter({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return <div className="ds-progress" role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progreso"}>
    <span style={{ width: `${safe}%` }} />
  </div>;
}
