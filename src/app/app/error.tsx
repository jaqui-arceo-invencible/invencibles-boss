"use client";

export default function MemberError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="admin-page">
    <h1>No pudimos cargar esta sección</h1>
    <p>Inténtalo de nuevo en un momento.</p>
    <button className="ds-button ds-button-primary" type="button" onClick={() => reset()}>Reintentar</button>
  </main>;
}
