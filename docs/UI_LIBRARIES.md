# Catálogo de bibliotecas UI

Licencias/compatibilidad indicadas como valores publicados en los repositorios/documentación consultados el 2026-11-11; volver a verificarlas antes de instalar, especialmente versiones y términos comerciales. Componentes de shadcn se copian al repositorio y se mantienen localmente.

| Herramienta | URL / licencia | Uso, dependencias y compatibilidad | Incorporación / alternativa |
|---|---|---|---|
| shadcn/ui + Sidebar Blocks | [ui.shadcn.com](https://ui.shadcn.com) · código por componente; licencia MIT en componentes base; revisar cada bloque | Base Tailwind/Radix o Base UI según variante. Sidebar con colapso desktop y Sheet mobile. Compatible con Next App Router; CLI copia código. | Ahora. Alternativa: React Aria Components, pero evitar mezclar sistemas. |
| Lucide React | [lucide.dev](https://lucide.dev) · ISC | Iconos SVG React; sin runtime adicional. | Ahora para shell. Alternativa: iconos incluidos de shadcn/lucide. |
| Supabase JS + SSR | [Supabase JS](https://github.com/supabase/supabase-js) y [SSR](https://github.com/supabase/ssr) · MIT | `@supabase/ssr` + `@supabase/supabase-js`; cookies en SSR Next. API de SSR indicada oficialmente como beta, revisar cambios. | Ahora para clientes; seguir docs Next vigentes. Alternativa solo cliente no sirve para sesión SSR. |
| React Hook Form + Zod | [react-hook-form.com](https://react-hook-form.com) / [zod.dev](https://zod.dev) · MIT | Formularios; RHF integra resolver Zod. React/Next compatible. | Fase 1 para invitaciones y auth. Alternativa: validación Server Action con Zod sin RHF. |
| TanStack Table | [tanstack.com/table](https://tanstack.com/table) · MIT | Tablas headless con React; depende de adaptador React. | Fase 2 para CMS/usuarios. Alternativa: tabla shadcn simple para listas pequeñas. |
| Tiptap | [tiptap.dev](https://tiptap.dev) · núcleo MIT; extensiones seleccionadas pueden ser comerciales | Editor enriquecido React/ProseMirror; extensiones y exportación se evalúan aparte. | Fase 2 para lecciones. Alternativa: editor por bloques propio limitado; no almacenar HTML sin sanitizar. |
| React DayPicker | [daypicker.dev](https://daypicker.dev) · MIT | Selector de fechas React; shadcn Date Picker normalmente lo integra. | Fase 4 para formulario/calendario ligero. |
| FullCalendar Standard | [fullcalendar.io](https://fullcalendar.io) · MIT para funcionalidades Standard; Premium tiene licencia comercial | React adapter y core; verificar plugins y licencia del feature set utilizado. | Fase 4 para eventos recurrentes/agenda. Alternativa: DayPicker + lista de eventos. |
| Yet Another React Lightbox | [yet-another-react-lightbox.com](https://yet-another-react-lightbox.com) · MIT | Galería/modal de imágenes React; plugins opcionales. | Fase 3 recursos visuales. Alternativa: Dialog de shadcn para vista simple. |
| dnd-kit | [dndkit.com](https://dndkit.com) · MIT | Arrastrar/soltar en React; sensores y sortable según versión. Revisar API vigente porque el ecosistema evoluciona. | Fase 2 para ordenar módulos/lecciones. Alternativa: botones subir/bajar accesibles. |
| Sonner | [sonner.emilkowal.ski](https://sonner.emilkowal.ski) · MIT | Toasts React, integración sencilla con shadcn/ui. | Fase 1/2 cuando haya formularios de acción. Alternativa: alert inline y `aria-live`. |
| Recharts | [recharts.org](https://recharts.org) · MIT | Gráficas composables React sobre SVG; revisar compatibilidad de la versión instalada con React vigente. | Fase 3 estadísticas. Alternativa: resúmenes/tablas accesibles. |
| Motion | [motion.dev](https://motion.dev) · MIT | Animación React; paquete `motion`. | Opcional, una vez definidos movimientos y accesibilidad. Alternativa: CSS transitions/reduced-motion. |

En fase inicial instala solo lo necesario para shell: shadcn/ui (copiado local), Lucide React y Supabase SSR/JS. Los demás se integran por necesidad para evitar peso y deuda de mantenimiento.

## Incorporación de Fase 2
Se incorporaron `@tiptap/react`, `@tiptap/pm` y `@tiptap/starter-kit` 3.30.3 desde npm para el editor enriquecido. La licencia publicada del repositorio y del paquete es MIT ([código](https://github.com/ueberdosis/tiptap/blob/main/packages/react/package.json), [licencia](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)); no se usan extensiones Pro. npm mostró avisos de peer dependency para extensiones de menú opcionales y un resumen de auditoría; no se introdujeron esas extensiones en la UI. dnd-kit, Yet Another React Lightbox, TanStack Table, React Hook Form/Zod y Sonner siguen evaluados pero no instalados: el CMS actual usa botones de orden accesibles y formularios simples con validación del servidor. Incorporarlos requiere un caso concreto y verificación de licencias/compatibilidad al hacerlo.
