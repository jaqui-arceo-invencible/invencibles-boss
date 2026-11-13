# Mejora de interfaz del centro de capacitación

Fecha: 2026-11-13

## Diagnóstico y alcance

Revisión del código de las rutas de inicio, academia, módulo, lección, recursos,
avances, comunidad, mensajes, avisos, perfil y administración; componentes
compartidos y capturas proporcionadas. Se mantiene la preferencia del usuario de
trabajar desde terminal. No se usan sesiones de navegador ni se despliega.

Problemas encontrados: estilos históricos con límites contradictorios (el
contenido multimedia conserva `max-width: 760px`), reglas móviles declaradas
antes de las generales, cabeceras móviles en escritorio, formularios sin límites
de lectura, botones duplicados para la siguiente lección, comentarios abiertos
que compiten con la capacitación y navegación móvil sin acceso directo al menú.

## Plan de ejecución

1. Base compartida: Roboto, lectura de 16 px, escala de títulos, contraste,
   controles de 44 px, foco y separación consistentes. Hoja de composición
   compartida cargada después del sistema existente, con reglas acotadas al shell.
2. Escritorio: cabeceras alineadas a la izquierda, anchos según tarea (catálogo,
   conversación, formularios y administración), cuadrículas de dos columnas y
   filtros horizontales. Móvil conserva una columna y menú accesible.
3. Aprendizaje: video al ancho disponible en 16:9, imágenes de contenido anchas,
   título debajo del video, sin repetir portada dentro de la lección. Barra de
   acciones compacta, índice del módulo y una única navegación anterior/siguiente.
4. Comunidad: comentarios con contador, botón para escribir y formulario bajo
   demanda; respuestas y edición conservan su funcionamiento. Reducir su peso
   visual respecto al contenido educativo.
5. Gestión: tarjetas, filtros, tablas, formularios y acciones del CMS con el mismo
   espaciado y jerarquía. Mantener autorizaciones, archivos privados y RLS actuales.
6. Verificar typecheck, lint, build y diff. Registrar resultados y límites reales.

## Criterios de aceptación

- Dos módulos por fila en escritorio, uno en móvil; portadas de lecciones 1:1.
- Medios sin límite heredado de 760 px; texto de lectura con medida cómoda.
- Un h1 por vista, foco visible, etiquetas accesibles, acciones con SVG Lucide.
- Comentarios accesibles sin mostrar un formulario grande de entrada.
- Sin dependencia nueva, migraciones, publicación de contenido o despliegue.

## Estado y comprobaciones

Los seis pasos están implementados.

Cambios entregados:

- Nueva composición compartida en `src/app/workspace-ui.css`, importada desde el
  layout raíz: contraste, tipografía, tarjetas, formularios, filtros, foco y
  distribución por ruta y tamaño de pantalla.
- Shell sin landmarks `main` anidados; enlace para saltar al contenido, menú móvil
  accesible y cabeceras de escritorio alineadas a la izquierda.
- Reproductor realmente ancho en 16:9 (se elimina el efecto del límite histórico
  del contenedor), imágenes de contenido anchas y texto con medida de lectura.
- La portada de catálogo ya no se repite dentro de la lección. Se mantienen las
  portadas 1:1 en las tarjetas del listado de lecciones.
- Índice navegable del módulo con lección actual y completadas, controles SVG,
  una sola acción de navegación siguiente y respuesta a fallos al guardar avance.
  El estado se reinicia al cambiar de lección mediante una clave por lección.
- Comentarios con contador, botón para abrir el formulario y formulario con foco
  al abrirse. Edición y respuestas mantienen el flujo existente.
- Recursos, comunidad, avisos y mensajes comparten anchos y controles coherentes;
  administración usa tarjetas de dos columnas y formularios con medidas de escritorio.
- Los errores de subida se muestran dentro del modal y recuperan el botón de
  envío ante un error de conexión.
- Configuración `themeColor` trasladada a `viewport` conforme a la guía local de
  Next.js: la compilación ya no emite ese aviso.

Comprobaciones realizadas:

- `pnpm run typecheck`: correcto.
- `pnpm run lint`: correcto, sin errores ni avisos tras retirar una directiva obsoleta.
- `npm run build`: correcto, 43 páginas generadas, sin los avisos de metadata previos.
- `git diff --check`: correcto.

Límite de verificación: revisión de fuentes, capturas del usuario y compilación;
no se hizo inspección visual autenticada en navegador por la preferencia previa
del usuario de no usarlo. Los cambios de responsive se especifican para una
columna móvil y composición de escritorio desde 900 px, con ajuste de navegación
inferior hasta 760 px. No se afirma una verificación visual interactiva.

No se modificaron migraciones, políticas, configuración cloud ni contenido
publicado. No se hicieron commits, push o despliegues.
