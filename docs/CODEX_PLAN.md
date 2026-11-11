# Plan maestro de Invencibles Boss

## Resumen ejecutivo
Crear una academia privada, mobile-first, para capacitar y acompañar a una comunidad emprendedora. Administradoras y editoras gestionarán módulos y lecciones dinámicas; las socias verán contenidos, recursos, avance y comunidad. La plataforma no procesará ventas.

## Arquitectura técnica
Next.js App Router + TypeScript estricto + Tailwind/shadcn/ui. Supabase Auth con sesiones SSR en cookies; PostgreSQL con RLS para autorización; Storage privado para recursos; Realtime solo al implementar funciones sociales. GitHub privado será fuente de código y Netlify construirá desde `main` con su adaptador OpenNext mantenido. Datos organizados por `teams` y membresías.

## Estado de avance (2026-11-11)
- [x] Revisar workspace: estaba vacío, Node 24 y npm disponibles; `gh` CLI no instalado.
- [x] Verificar documentación oficial de Next.js, Supabase SSR, Netlify y shadcn Sidebar.
- [x] Crear scaffold inicial de Next.js y estructura de documentación/configuración.
- [x] Instalar Next.js, shadcn Sidebar/Card/Sheet, Lucide React y Supabase SSR/JS; terminar shell responsive.
- [x] Ejecutar typecheck y lint. Build validado con `next build --webpack`.
- [x] Crear repositorio privado `invencibles-boss` en `jaqui-arceo-invencible` y commit inicial local (`577533c`).
- [ ] Publicar el commit inicial en GitHub (push HTTPS devuelve `Repository not found` desde la terminal no autenticada; el repo privado sí aparece en la sesión web).
- [ ] Completar proyecto Supabase Cloud y guardar URL/clave pública en entorno seguro.
- [ ] Conectar sitio Netlify a GitHub, configurar variables y verificar deploy.

> Validación: `npm run typecheck`, `npm run lint` y `npm run build` pasan. El script de build usa Webpack porque Turbopack no puede iniciar su proceso auxiliar en este entorno. GitHub confirmó la creación del repositorio privado. Supabase confirmó la organización `Invencibles Boss` en Free; el proyecto `invencibles-boss` quedó preconfigurado (región general Americas, exposición automática de tablas desactivada y auto-RLS activado), pero espera que la persona propietaria escriba su contraseña de Postgres y lo cree. No hay tablas productivas ni invitaciones enviadas.

## Fases y aceptación

### Fase 0 — Infraestructura y shell (actual)
Tareas: bootstrap, navegación base responsive para socias/administración, dependencias esenciales, documentación, repo privado, Supabase, Netlify.
Aceptación: `npm run typecheck`, lint y build pasan; repo privado con commit limpio; entorno Supabase enlazado; deploy Netlify automático desde `main` accesible sin errores.
Dependencias: acceso autenticado a GitHub para el push; contraseña de DB introducida por la persona propietaria en Supabase; push del repo para importar en Netlify; configuración segura de claves públicas.

### Fase 1 — Acceso privado e invitaciones
Tareas: perfiles, equipos y membresías; política de registro cerrado; invitación con expiración/uso único; recuperación; checks de rol server-side; RLS; pruebas con cuentas internas. Configurar SMTP antes de enviar invitaciones externas.
Aceptación: persona no invitada no crea cuenta; invitación válida crea membresía con rol correcto; rutas/datos/Storage bloquean usuarios sin membresía activa; admin/editora/socia reciben permisos mínimos.
Dependencias: SMTP, dominio y proyecto Supabase; tabla y políticas aprobadas.

### Fase 2 — Academia y CMS
Tareas: módulos dinámicos, lecciones, bloques de contenido, orden, borradores/publicación, permisos, recursos adjuntos.
Aceptación: editora crea/ordena/publica contenido sin código; una socia solo obtiene contenido publicado y autorizado.

### Fase 3 — Recursos y avance
Tareas: biblioteca privada, progreso por lección, dashboard y métricas personales.
Aceptación: acceso a archivos condicionado por membresía; avance reproducible y aislado por usuario/equipo.

### Fase 4 — Comunidad, comentarios y eventos
Tareas: preguntas, experiencias, comentarios por lección, retos, ejercicios, calendario y notificaciones; activar Realtime donde aporte valor.
Aceptación: RLS limita lectura/escritura al equipo y autoría/moderación definida; estados vacíos y notificaciones accesibles.

### Fase 5 — Mensajería directa y endurecimiento
Tareas: conversaciones/participantes, políticas exclusivas por participantes, auditoría, rendimiento, accesibilidad y operación.
Aceptación: solo participantes leen y escriben; controles de abuso/retención definidos; revisión de seguridad completada.

## Dependencias de trabajo
Fase 0 → Fase 1 → Fase 2 → Fase 3. Fase 4 depende de identidad, membresía y estructura de contenido. Mensajes privados dependen de membresías y reglas de seguridad maduras. No ejecutar migraciones productivas hasta aprobar y validar sus políticas.

## Riesgos y decisiones pendientes
- El correo transaccional de Supabase requiere SMTP propio para uso real.
- Definir dominio y política de recuperación/expiración de invitaciones.
- Definir límites de archivo, derechos/licencias y retención de recursos.
- Definir quién puede publicar, moderar comentarios y reactivar membresías.
- El catálogo de componentes cambia: revisar compatibilidad/licencias al incorporar, no solo en esta fecha.
- Sin npm y cuentas cloud verificadas, el primer deploy no es comprobable.

## Próxima tarea recomendada
1. Completar el proyecto Supabase desde el formulario preparado escribiendo ahí una contraseña nueva de Postgres (no compartirla por chat).
2. Conectar GitHub Desktop o la autenticación de Git y publicar el commit `577533c` en `main`.
3. Importar el repo en Netlify, añadir URL y clave publishable desde Supabase y verificar el deploy.
4. Actualizar esta lista con los IDs y estados reales antes de iniciar Fase 1.
