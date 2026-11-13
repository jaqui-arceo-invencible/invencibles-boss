"use client";

export function ConfirmSubmitButton({ label, confirm, danger = false, children }: { label: string; confirm: string; danger?: boolean; children: React.ReactNode }) {
  return <button className={danger ? "icon-tool danger" : "icon-tool"} type="submit" aria-label={label} onClick={(event) => {
    if (!window.confirm(confirm)) event.preventDefault();
  }}>{children}</button>;
}
