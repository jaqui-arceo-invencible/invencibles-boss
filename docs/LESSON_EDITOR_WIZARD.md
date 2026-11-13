# Editor de lecciones por pasos

## Flujo implementado

1. Tipo: texto o video, selección accesible con radios. Cambiar a video muestra
   confirmación si existen bloques, porque al guardar ese formato el servidor
   conserva un video y no los bloques de texto. Antes de guardar puede regresarse
   a texto sin perder los cambios locales.
2. Datos y portada: título, descripción y duración; portada opcional. La portada
   indica que se guarda al subirla.
3. Contenido: edición visual de texto, avisos con sus colores de publicación,
   listas de actividades con casillas visuales y campos editables, imágenes con
   URL firmada y reproductores de video. Los recursos descargables son opcionales
   y muestran que se guardan al agregarlos.
4. Revisión: resumen y configuración de comentarios. Acciones explícitas para
   guardar borrador o publicar/actualizar según el estado y los permisos.

Los paneles se mantienen montados al cambiar de paso; el contenido textual también
se conserva en estado local si se cambia temporalmente al formato video. No hay
autoguardado de texto: se guarda desde el último paso. Se avisa al salir si hay
cambios sin guardar. Navegación y botones finales esperan las cargas de archivos.

Publicar o actualizar llama primero a `persistLessonDraft`, valida su resultado y
solo después a `publishLesson`. Los errores de guardado detienen la publicación;
las autorizaciones siguen ejecutándose en el servidor. No se modificó el esquema
ni se aplicaron operaciones de contenido a producción durante esta implementación.

## Editor visual

- Controles SVG de Lucide con nombres accesibles y estados de formato activos.
- Ordenar y quitar bloques se agrupan en un menú secundario; quitar requiere
  confirmación.
- Añadir texto, aviso, checklist o imagen es la acción principal; video, documento
  y separador se encuentran en «Más».
- Avisos usan las mismas clases `callout` que la vista publicada. El campo de texto
  se edita dentro del propio aviso. Las casillas de actividades representan la
  apariencia publicada; en administración se edita su texto, no el progreso.
- Previsualización privada de imágenes mediante URLs firmadas de cinco minutos;
  se renuevan al volver a cargar la pantalla.

## Validación

- `pnpm run typecheck`: correcto.
- `pnpm run lint`: correcto, sin avisos.
- `npm run build`: correcto, 43 páginas generadas.
- `git diff --check`: correcto.

Revisión de código y compilación; sin inspección interactiva en navegador por la
preferencia previa del usuario. No se afirma una prueba visual autenticada.
