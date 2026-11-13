# Subida directa de archivos

El editor ya no requiere elegir recursos de una biblioteca ni introducir un
nombre antes de subir. `DirectLessonUpload` abre el selector del dispositivo,
envía el archivo y usa su nombre como título. La biblioteca permanece como
listado administrativo de archivos, no como paso obligatorio del editor.

- Imágenes y documentos: subida desde su bloque y asociación por ID estable,
  con imagen previsualizada al terminar. No cambia de bloque si se reordena.
- Descargables: botón directo y listado de archivos; se retiró el modal de
  selección/subida. Si falla la asociación se ofrece reintentar sin volver a subir.
- Portadas: botón común, sin la fila nativa truncada de selección; se mantienen
  conversión y validación anteriores. La portada opcional queda en desplegable.
- Biblioteca: un botón elige el archivo y envía el formulario de subida; título
  inferido del nombre, editable después en los detalles existentes.
- Perfil: elegir la imagen envía el formulario automáticamente.
- Comunidad: mismo selector visual con previsualizaciones; los archivos se envían
  con la publicación, conservando su flujo de revisión antes de publicar.
- Detalles secundarios (texto alternativo, estilo de aviso, comentarios) se
  muestran bajo demanda.

Se mantiene Storage privado, autorización en servidor, límites MIME/tamaño y
validación de firma de archivo. La acción devuelve una URL firmada de cinco
minutos para previsualizar. El límite de cuerpo de Server Actions se ajusta a
21 MB para admitir los 20 MB del archivo y el margen multipart. La validación
del archivo continúa restringida a 20 MB en servidor.

Los pasos del editor esperan las subidas. Ordenar o quitar bloques se desactiva
mientras se sube para evitar perder la asociación del archivo.

Comprobación: typecheck, lint y diff sin errores; build local correcto.
Revisión basada en código y capturas del usuario; sin prueba visual interactiva
en navegador por su preferencia previa. No se ejecutaron subidas de prueba contra
producción ni se modificaron migraciones o configuración cloud.
