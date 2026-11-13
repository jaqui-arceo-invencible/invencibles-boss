# Comunidad

Esta nota cubre la comunidad, los mensajes directos, los avisos dentro de la app y la moderación. No hay llamadas, audios, grupos, seguidores, push ni correo.

## Tablas

- `community_categories`: nombre, slug y orden por equipo. Las siete categorías iniciales se siembran para `invencibles-boss`.
- `community_posts`: texto plano de hasta 4000 caracteres, categoría del mismo equipo, estado `visible` o `hidden`, y fijado solo para administración.
- `post_images`: hasta cuatro imágenes por publicación. La ruta es `{equipo}/community/{usuaria}/{id}.jpg|png|webp` dentro de `academy-private`.
- `post_reactions`: un corazón por persona y publicación.
- `community_comments`: un comentario pertenece a una publicación o a una lección, nunca a las dos. La respuesta solo puede colgar de un comentario de primer nivel y del mismo contexto.
- `content_reports`: un reporte por publicación, comentario o mensaje. La misma persona no lo duplica. La administración ve el mensaje reportado, no el resto de la conversación.
- `conversations` y `conversation_members`: un par por equipo, con el identificador menor primero. El disparador crea a las dos participantes.
- `direct_messages`: texto de hasta 2000 caracteres. Quien lo envió puede marcarlo como eliminado. El límite es 40 por hora.
- `user_blocks`: el bloqueo impide mensajes nuevos en las dos direcciones.
- `notifications`: las crea un disparador en el esquema `private`. Nadie inserta avisos de otra persona. Un aviso fijado se entrega una sola vez por persona y publicación.
- `profiles.directory_visible`: la socia decide si aparece en el directorio. Una publicación visible sigue mostrando su nombre.
- `lessons.comments_enabled`: la administradora puede cerrar los comentarios de una lección. Los ya escritos siguen visibles.

## Acceso

Cada tabla tiene RLS. La autora es `auth.uid()` y debe tener una membresía activa. Una publicación oculta la ven su autora y la administración. Los comentarios de lección solo se crean si el módulo y la lección están publicados y los comentarios siguen abiertos. Hay límites en la base: 10 publicaciones, 30 comentarios y 10 reportes por hora. La administración fija, oculta y borra; no hay rol moderadora.

Las imágenes no se guardan en `resources`. Leer una imagen exige que exista la fila y que la publicación sea visible para quien pide la URL firmada.

## Interfaz

`/app/community` lista de ocho en ocho, con búsqueda, categoría, alta, edición, borrado, corazón y comentarios. La lección publicada termina con «Preguntas y comentarios». La respuesta de una administradora lleva esa etiqueta junto al nombre. El reporte se envía en `/app/community/report`. La barra inferior muestra Inicio, Academia, Comunidad, Avances y Perfil.

`/app/messages` es la bandeja. En escritorio se ven la lista y el hilo; en el teléfono, una pantalla cada vez. Mensajes queda en el menú de escritorio y en el inicio, no como sexta pestaña. `/app/notifications` guarda respuestas, mensajes, comentarios y avisos fijados. La campana del encabezado muestra los no leídos. `/admin/community` es solo para la administradora: reportes, ocultar o restaurar, y resolver o descartar.
