export function SettingsField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="ds-field">
    <h2>{label}</h2>
    <div className="ds-field-value"><span>{value}</span></div>
    {hint ? <p>{hint}</p> : null}
  </div>;
}
