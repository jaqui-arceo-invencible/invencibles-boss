# Arquitectura del CMS

El CMS usa `modules` → `lessons` → `lesson_revisions` → `content_blocks`. Los registros pertenecen al equipo por `modules.team_id`. Las consultas del portal requieren membresía activa y `status='published'` en módulo y lección. La lección publicada apunta a `published_revision_id`; el editor guarda en `working_revision_id` mediante `save_lesson_draft`, una función transaccional que bloquea la lección, valida rol, reemplaza el borrador y evita escrituras parciales.

La administradora publica con `publish_lesson`; una editora crea y modifica borradores, sin publicar. `move_module` y `move_lesson` bloquean la entidad superior antes de intercambiar posiciones. Las Server Actions comprueban identidad y equipo; RLS y funciones SQL son la segunda barrera. Los módulos iniciales se insertan idempotentemente en la migración cuando hay una admin activa.

`resources` guarda metadatos y rutas del bucket privado. Una lección guarda referencias por UUID en bloques de imagen/documento. Antes de guardar, la función SQL comprueba que cada recurso pertenece al equipo. La UI no usa HTML arbitrario; Tiptap guarda JSON de ProseMirror que el portal representa con un conjunto cerrado de nodos y marcas.

Limitaciones actuales: faltan guardado automático y bloqueo optimista para edición simultánea. Módulos y lecciones se pueden duplicar como borradores; la biblioteca tiene búsqueda, filtros, paginación y borrado de archivos sin referencias. El editor advierte al salir con cambios sin guardar. No hay recuperación automática de una revisión anterior; se preservan las publicadas para una futura función de restauración.
