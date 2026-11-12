# Bloques de contenido

Cada fila de `content_blocks` pertenece a una revisión, tiene `position`, `type` y `content` JSONB. El editor limita a 100 bloques y hasta 50 000 caracteres por campo. `rich_text` guarda `doc` como JSON de ProseMirror; el renderizador solo admite párrafos, H2/H3, listas, citas, negritas, cursivas y enlaces HTTPS sin credenciales. Texto heredado puede guardarse en `text`. Nunca se interpreta HTML de usuarias.

- `image`: `resourceId` UUID y `alt` accesible.
- `video`: `url` HTTPS de YouTube o Vimeo; se transforma a dominios de embed permitidos.
- `document`: `resourceId` de PDF, con URL firmada.
- `checklist`: `title` e `items` separados por líneas; no registra progreso.
- `divider`: objeto vacío.
- `callout`: `text` y `variant` (`neutral`, `info`, `warning`).

El orden se cambia con botones accesibles para teclado. La migración limita el tamaño de JSON y el servidor valida tipo y recursos antes de guardar. La validación profunda de todos los nodos del documento enriquecido puede endurecerse en una migración posterior.
