# Seguimiento de avance

Los porcentajes no se guardan. Se calculan al consultar las lecciones publicadas.

## `lesson_progress`

Una fila por usuaria y lección (`user_id`, `lesson_id`). Estados: `in_progress` y `completed`. Sin fila, la lección está pendiente.

Abrir una lección llama a `touch_lesson_progress` con `mark_complete = false`. Si ya estaba completada, solo actualiza `last_opened_at`. Completar usa la misma función con `mark_complete = true`. Un trigger impide volver de `completed` a `in_progress` en esta fase.

La función y las políticas exigen sesión, membresía activa del mismo equipo y lección publicada dentro de un módulo publicado. El identificador de usuaria sale de `auth.uid()`, no del cliente.

## Porcentaje

Progreso del módulo = lecciones completadas / lecciones publicadas con revisión publicada. Si el módulo no tiene lecciones publicadas, el porcentaje es 0 y el estado es «Sin lecciones publicadas», no «Completado».

El progreso general usa la misma cuenta sobre todos los módulos publicados. Publicar una lección nueva baja el porcentaje y conserva las filas ya completadas. Una lección que deja de estar publicada deja de entrar en la cuenta; su fila histórica permanece.

## `checklist_item_progress`

La clave es `user_id`, `lesson_id` e `item_id`. El `item_id` viaja en el JSON del bloque, no es la posición. Reordenar actividades no reasigna el avance. Los checklists antiguos, guardados como una línea por actividad, reciben un id derivado del texto.

Marcar una actividad no completa la lección. Se puede marcar y desmarcar. El `block_id` no tiene llave foránea porque republicar crea bloques nuevos; el id estable es `item_id`.

## Ventana de bienvenida

`membership_is_in_welcome_window` compara `memberships.joined_at` con `now()` en SQL. No usa la fecha de creación global de la usuaria.
