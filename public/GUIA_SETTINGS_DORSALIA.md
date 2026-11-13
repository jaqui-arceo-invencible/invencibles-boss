# Guía de diseño: Invencibles Boss

Sistema visual para módulos, configuración, academia y el resto de la aplicación. Parte de la estructura de la guía de configuraciones de Dorsalia y la pasa a tema claro. Actualizada el 11 de noviembre de 2026.

## Tema claro

| Token | Valor | Uso |
| --- | --- | --- |
| Fondo de página | `#FFFFFF` | Lienzo de toda la app |
| Superficie | `#F4F4F4` | Grupos, campos y botones secundarios |
| Texto | `#171717` | Títulos, filas y botón primario |
| Texto secundario | `rgba(23, 23, 23, 0.5)` | Ayudas, valores y descripciones |
| Peligro | `#DE5757` | Errores y cierre de sesión |
| Radio | `20px` | Contenedores, campos y botones |
| Fuente | Roboto | Interfaz completa |

En móvil el contenido lleva 15 px laterales. Las pantallas de índice, perfil, configuración y listas usan un ancho máximo de 640 px. El editor de lecciones puede llegar a 960 px para colocar el contenido y los datos en dos columnas.

## Componentes

| Pieza | Archivo | Cuándo usarla |
| --- | --- | --- |
| `PageHeader` | `src/components/design/page-header.tsx` | Regresar, título centrado y una acción opcional a la derecha. Va fijo arriba, con degradado de blanco a transparente. |
| `PrimaryButton` | `src/components/design/buttons.tsx` | La acción principal de la pantalla: guardar, crear, publicar, entrar. Fondo `#171717`, texto blanco, alto 44 px. |
| `SecondaryButton` | `src/components/design/buttons.tsx` | Acciones alternativas: duplicar, filtrar, cancelar. Fondo `#F4F4F4`, texto `#171717`, alto 44 px. |
| `SettingsProfileHeader` | `src/components/design/settings-section.tsx` | Encabezado compacto con inicial de 39 × 39 px, borde de 4 px, nombre de 20 px y detalle de 14 px al 50 %. |
| `SettingsSection` | `src/components/design/settings-section.tsx` | Grupo con título de 20 px, peso 600, interlineado 24 px. Deja 10 px antes del contenedor. |
| `SettingsLink` | `src/components/design/settings-section.tsx` | Fila de navegación: icono de 24 px, 10 px hasta el texto de 16 px, flecha de 24 px. Separación entre filas: 16 px. |
| `SettingsField` | `src/components/design/settings-field.tsx` | Dato de solo lectura. Título de 20 px, 10 px debajo el valor en una pastilla de 44 px. Entre campos, 30 px. |

Los botones de shadcn (`Button`) usan las mismas medidas. `default` equivale al primario y `outline` o `secondary` al secundario. No crees otro botón con colores sueltos.

## Espaciado

- Después del encabezado de perfil, 40 px antes del primer grupo.
- Entre un grupo y el siguiente, 30 px.
- El contenedor de un grupo usa 15 px arriba, abajo e izquierda, y 10 px a la derecha.
- Un campo de formulario sigue la misma pastilla: alto 44 px, 15 px de padding izquierdo y fondo `#F4F4F4`.
- No abras un modal para leer o editar un dato simple. Usa una página con `PageHeader` y un `fallback` de regreso coherente.

## Dónde vive en Invencibles Boss

| Ruta | Qué muestra |
| --- | --- |
| `/` y `/admin` | Índice del espacio: perfil compacto y filas hacia las secciones reales |
| `/perfil` | Nombre, correo y rol de la socia |
| `/admin/configuracion` | Los mismos datos de la administradora |
| `/admin/modules` | Lista de módulos y alta de un borrador |
| `/admin/modules/[moduleId]` | Datos del módulo y lista de lecciones |
| `/app/academy` | Módulos publicados para la socia |
| `/app/community` | Feed privado, publicación y comentarios de lección |
| `/app/messages` | Bandeja y conversación directa |
| `/app/notifications` | Avisos de la socia |
| `/admin/community` | Reportes y moderación, solo administración |
| `/admin/library`, `/admin/users`, `/admin/invitations` | Misma página clara, campos y botones del sistema |

## Antes de cerrar una pantalla

- La ruta abre directo y también desde su fila del índice.
- El encabezado, los 15 px laterales, el radio de 20 px, los iconos de 24 px y Roboto coinciden con los componentes compartidos.
- El botón principal es oscuro y el secundario es la superficie gris. No vuelvas al morado anterior ni a fondos oscuros.
- No hay filas que parezcan navegables si no tienen destino.
- En móvil, el texto y los controles siguen dentro de los 15 px y no se cortan.
