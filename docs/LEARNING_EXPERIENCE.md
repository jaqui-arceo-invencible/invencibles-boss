# Experiencia de aprendizaje

El portal de la socia vive bajo `/app` y usa la sesión y el equipo activos. Los módulos en borrador o archivados no aparecen.

## Pantallas

- `/app` saluda con el nombre guardado en el perfil. Si el nombre está vacío, dice «¡Hola!». Muestra módulos publicados, lecciones completadas, porcentaje, la siguiente lección y accesos a recursos, avances y perfil.
- `/app/academy` lista los módulos publicados con portada, descripción, número de lecciones y estado.
- `/app/academy/[moduleSlug]` muestra las lecciones publicadas en el orden del CMS. Los estados usan Circle, CircleDot y CheckCircle2. No hay bloqueo entre lecciones.
- `/app/academy/[moduleSlug]/[lessonSlug]` renderiza la revisión publicada con el mismo renderizador del CMS. Incluye lección anterior, siguiente y volver al módulo. Esas rutas solo existen si la lección está publicada.
- `/app/resources` reúne imágenes y PDF ligados a lecciones o portadas publicadas, sin duplicar el archivo. Hay búsqueda, filtro por tipo y módulo, y páginas de 12.
- `/app/progress` resume completadas, pendientes, porcentaje, última actividad e historial.
- `/app/profile` muestra correo, fecha de incorporación, equipo y rol. Se pueden editar el nombre y la imagen. La contraseña usa `updateUser` de la sesión. `/perfil` redirige aquí.

## Primeras 72 horas

El módulo de bienvenida se reconoce por el slug `primeros-pasos-primeras-72-horas`. Durante las 72 horas siguientes a `memberships.joined_at`, el inicio lo prioriza si está publicado y aún no está completo. Después sigue disponible. No hay temporizador ni bloqueo.

## Textos

Los textos fijos del portal están en `src/lib/learning/copy.ts` para poder moverlos al CMS más adelante.
