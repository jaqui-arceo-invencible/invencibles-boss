# Informe de Fase 2 — 2026-11-11

## Implementado
- Migraciones `20261111190000_phase_2_cms.sql`, `20261111203000_phase_2_published_metadata.sql` y `20261111210000_phase_2_resource_deletion.sql` aplicadas en Supabase SQL Editor. Incluyen seis tablas, índices, restricciones, RLS, funciones transaccionales, separación entre borrador y versión publicada, y bucket privado.
- Diez módulos iniciales en borrador, cargados idempotentemente.
- Panel `/admin/modules`, detalle `/admin/modules/[moduleId]`, editor y vista previa de lecciones, biblioteca `/admin/library`.
- Creación y edición de módulos, portada desde biblioteca, duplicación de módulos y lecciones y lecciones, cambio de estado, creación y orden de lecciones, edición por bloques, Tiptap con enlaces HTTPS, publicación solo por administradora.
- Biblioteca con subida y borrado seguro de imágenes/PDF, validación de MIME y firma, metadatos, búsqueda, filtros, paginación y URLs firmadas de cinco minutos.
- Rutas privadas `/app/academy`, `/app/academy/[moduleSlug]` y `/app/academy/[moduleSlug]/[lessonSlug]` para contenido publicado.
- Estado de cambios sin guardar y confirmación antes de salir o publicar una versión anterior. Orden de bloques, módulos y lecciones mediante botones accesibles.

## Verificaciones ejecutadas
- Supabase SQL Editor devolvió `Success. No rows returned` para las tres migraciones.
- API de servicio: diez módulos en `draft`, cero lecciones y recursos, bucket `academy-private` con `public=false`.
- Cliente anónimo: lectura de `modules` y ejecución de `delete_unused_resource` rechazadas con código `42501`.
- Consulta SQL de solo lectura: cinco comprobaciones en `true` para aislamiento de metadatos publicados, republicación idempotente, política de recursos publicados, trigger de referencias y función de borrado.
- Sesión legítima de administradora: creación y edición de un módulo verificadas en el panel local. El módulo temporal se eliminó después con autorización expresa y quedaron diez módulos.
- `npm run typecheck`, `npm run lint`, `npm run build` y `node --test tests/content-blocks.test.mjs`: pasaron. Repetir tras cualquier edición posterior.
- Inspección visual de módulos en escritorio y de módulos/biblioteca a 390 px; corregidos ancho del contenedor, contraste de botones y selector de archivos. Falta inspección móvil del editor con una lección real.

## Pendiente y límites de verificación
- La revisión automática rechazó generar/verificar un magic link de la administradora sin su credencial y crear una lección persistente de prueba en producción. No se repitieron esas acciones por vías indirectas.
- Falta probar de extremo a extremo la edición, publicación y lectura de una lección con cuentas legítimas de administradora y socia; tampoco se comprobó separación entre equipos con dos equipos reales. No se presentan como pruebas superadas.
- Faltan pruebas de subida/borrado con archivos reales, guardado automático y pruebas móviles del editor. El orden usa botones de subir/bajar; no se incorporó `dnd-kit`.
- Los errores de guardado del editor todavía redirigen y pueden perder los valores escritos tras un fallo del servidor. La advertencia de cambios sin guardar protege salidas voluntarias y recargas del navegador.
- No se desplegó Netlify ni se hizo push a `main` por la preferencia vigente de desarrollo local sin nuevos despliegues. Las migraciones se aplicaron desde SQL Editor; registrar las tres en el historial de Supabase CLI antes de un futuro `db push`.

## Decisiones técnicas
- Tiptap usa paquetes abiertos/MIT. No se añadieron bibliotecas de tablas, lightbox o arrastre sin una necesidad concreta.
- Las revisiones publicadas son inmutables. Las funciones SQL guardan y publican en transacciones, y los metadatos públicos conservan la versión publicada durante una edición.
- Las socias solo pueden leer archivos referenciados por material publicado; los archivos siguen siendo privados. El borrado rechaza recursos usados y guarda un trabajo de limpieza si Storage falla tras retirar metadatos.
