# Guardar y publicar: corrección y simplificación

## Causa reproducida

`parseBlocks` rechaza bloques de imagen/documento sin `resourceId`. El editor
permitía añadir esos espacios vacíos y los enviaba tal cual, de modo que guardar
fallaba antes de publicar. La respuesta quedaba arriba de una pantalla larga.

## Corrección

- `prepareDraftBlocks` omite únicamente espacios multimedia vacíos y reajusta
  posiciones. Un ID o URL no vacío inválido conserva su validación en servidor.
- Guardar y publicar usan acciones explícitas distintas; ya no dependen del
  campo `intent` del botón para decidir si publicar.
- `saveAndPublishLesson` verifica administradora, espera el guardado y publica
  con el RPC existente. Si guardar falla, no publica. Si publicar falla, informa
  de que el borrador quedó guardado. No cambia autorizaciones ni políticas.
- La respuesta se muestra junto a los botones finales. Tras éxito se refrescan
  los datos y se indica que la lección está publicada/actualizada.
- Bloqueo contra envíos simultáneos en el cliente.
- Datos básicos con fondo gris y borde explícito, superando las reglas antiguas
  de campos sin borde. Imágenes y portadas vacías con un SVG y «Subir imagen»;
  sin instrucciones de formato o mensajes de portada vacía.

## Comprobaciones

- `node --test tests/lesson-draft.test.mjs`: 3 pruebas correctas; cubren la
  regresión, conservación de medios válidos y rechazo de datos inválidos.
- `pnpm run typecheck`: correcto.
- `pnpm run lint`: correcto.
- `git diff --check`: correcto.
- `npm run build`: correcto.

El runner de Node informa del tipo de módulo implícito de los archivos TS; no
afecta al resultado. No se cambió la configuración del proyecto para silenciarlo.
Sin prueba de publicación contra datos reales ni inspección de navegador, por la
preferencia previa del usuario. La verificación cubre pruebas locales y compilación.
