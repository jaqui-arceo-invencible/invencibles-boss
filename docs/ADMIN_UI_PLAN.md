# Simplificación de administración

## Plan

1. Organizar el inicio por tareas: contenido, equipo y configuración.
2. En módulo, priorizar lecciones y crear lección. Mover edición de datos a una
   sección desplegable; publicación con acción explícita y estado visible.
3. Agrupar ordenar, duplicar, cambiar estado y eliminar en «Más acciones» por
   lección. Mantener confirmación para eliminar y permisos del servidor.
4. Crear módulos y subir archivos en diálogos reutilizables, dejando los listados
   como contenido principal de cada pantalla.
5. Mostrar formularios de acceso por integrante bajo demanda, con un resultado
   de búsqueda claro. Unificar pesos, botones, formularios y espaciado en admin.
6. Ejecutar typecheck, lint, build y revisión de diff; registrar resultados.

La revisión parte del código y las capturas. Se conserva la preferencia de usar
terminal. No se cambian datos, roles, migraciones ni se despliega.

## Resultado

Completado en código:

- Inicio agrupado en «Contenido y capacitación» y «Equipo y comunidad».
- Nombres coherentes en navegación: «Integrantes» y «Moderación».
- Módulos: creación en diálogo; detalle con estado explícito y publicar/pasar a
  borrador como acción directa. Datos y portada se editan en desplegable.
- Lecciones: botón de creación junto al listado. Orden, duplicación, estado y
  eliminación dentro de «Más acciones». Confirmaciones y autorizaciones existentes
  permanecen activas. Archivo del módulo separado de la tarea cotidiana.
- Editor: navegación por anclas a datos, portada, contenido, recursos y publicación.
- Biblioteca: subida en diálogo y filtros con nombres accesibles.
- Integrantes: formularios de acceso por fila bajo demanda; contador de resultados
  y distinción de la cuenta propia, con confirmación antes de cambiar permisos.
- Estilos acotados a administración: títulos 20/18 px, texto y etiquetas con peso
  consistente, controles de 44 px, menos bordes y controles compitiendo por atención.

Validación:

- `pnpm run typecheck`: correcto.
- `pnpm run lint`: correcto, sin avisos.
- `npm run build`: correcto; 43 páginas generadas, sin avisos.
- `git diff --check`: correcto.

No se hizo verificación visual en navegador por la preferencia previa del usuario;
la comprobación cubre fuentes y compilación. Cambios locales, sin desplegar ni
ejecutar acciones administrativas sobre datos reales.
