# Experiencia móvil

En pantallas de hasta 760 px, el portal de la socia oculta el botón del sidebar y muestra una barra inferior fija con Inicio, Academia, Comunidad, Avances y Perfil. La barra respeta `env(safe-area-inset-bottom)`, marca la sección activa y deja espacio al final del contenido. Mis recursos y Mensajes siguen en el índice y en el menú de escritorio. En el teléfono, la bandeja y el hilo son pantallas separadas. Los destinos viven en `src/components/layout/app-shell.tsx`.

Las tarjetas se apilan en el celular y pasan a dos columnas desde 900 px. La lectura de la lección permanece en una columna de hasta 640 px. Imágenes y videos se ajustan al ancho.

## PWA

`public/manifest.webmanifest` define el nombre Invencibles Boss, el inicio en `/app`, colores blanco y negro, y el icono provisional `public/icon.svg`. No hay service worker, caché de páginas privadas ni notificaciones push. Los archivos siguen saliendo por URLs firmadas de corta duración.
