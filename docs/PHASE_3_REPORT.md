# Informe de Fase 3

Fecha: 2026-11-12. Trabajo local. No se hizo push ni deploy en Netlify.

## Ya existía

Lectura de módulos y lecciones publicados en `/app/academy`, renderizador de bloques, autenticación, roles y biblioteca privada del CMS. No había tablas de avance, checklists interactivos, dashboard, recursos de la socia, avances, perfil editable ni navegación inferior.

## Implementado

- Dashboard en `/app` con datos reales. Sin módulos publicados muestra ceros, no cifras de ejemplo.
- Catálogo, módulo y lección con estados Pendiente, En progreso y Completada.
- Completar lección y actividades de checklist, guardados en Supabase.
- `/app/resources`, `/app/progress` y `/app/profile`.
- Barra inferior en el celular y sidebar en escritorio.
- Manifiesto PWA sin caché de contenido privado.
- Migraciones `20261112041323_phase_3_learning_progress.sql` y `20261112041909_welcome_window.sql`, aplicadas en el proyecto `invencibles-boss`.

## Pruebas ejecutadas

- `pnpm exec tsc --noEmit`: pasó.
- `pnpm exec eslint` sobre los archivos de esta fase: pasó después de renombrar variables `module`.
- `node --test tests/learning-progress.test.mjs tests/content-blocks.test.mjs`: 9 pruebas pasaron.
- En el navegador, con la sesión de administración: el inicio ocultó los 10 módulos en borrador y mostró «¡Hola!» porque el perfil no tiene nombre. Recursos, avances y perfil cargaron sus estados vacíos.
- Se publicó una lección de prueba. Abrirla pasó a «En progreso». Marcar «Revisar los recursos» quedó en `checklist_item_progress`. «Marcar como completada» quedó en `lesson_progress` y siguió completada después de recargar. Mis avances mostró 1 de 1 y la fecha. La barra inferior apareció a 390 px.
- RLS activo en ambas tablas, con políticas de lectura, alta y cambio solo de la propia fila. No hay política de borrado.
- Los avisores de seguridad no marcaron estas tablas. Siguen avisos anteriores de funciones `security definer` y de protección de contraseñas filtradas.

No se ejecutó el build de producción: `next dev` está usando `.next`. No se probaron dos socias, una cuenta suspendida ni un equipo ajeno.

## Limpieza de la prueba

La lección de prueba no se pudo borrar: el trigger `protect_published_revision` falla al leer `old.revision_id` en `lesson_revisions`. El módulo `verificacion-temporal-fase-3` quedó archivado, con título «Verificación temporal (oculto)», y se borraron sus filas de avance. No aparece en el portal.

## Decisiones

- El porcentaje se calcula; no se duplica en una columna.
- Completar es definitivo en esta fase. Abrir de nuevo no lo quita.
- El checklist usa ids estables dentro del contenido. Los ids de bloque cambian al republicar.
- Las primeras 72 horas salen de `joined_at` y no bloquean nada.
- No se usó la clave de servicio para el avance de la socia.

## Pendiente

- Segunda socia, cuenta suspendida y aislamiento entre equipos.
- Subir imagen de perfil y cambiar contraseña desde la pantalla, con una sesión real.
- Borrar el módulo archivado de verificación cuando el trigger de revisiones lo permita.
- Iconos PNG para instalar la PWA en iOS.
- Consulta de avances para administración, sin una lectura global insegura.
- Build de producción y, solo si se autoriza, push y Netlify.

## Siguiente fase

Comunidad, comentarios por lección y mensajes internos, con RLS por equipo y autora, sin rankings ni notificaciones push.
