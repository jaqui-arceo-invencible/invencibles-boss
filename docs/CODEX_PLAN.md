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
- [x] Crear repositorio privado `invencibles-boss` en `jaqui-arceo-invencible`; commits locales en `main`.
- [x] Crear Supabase `invencibles-boss`, conectar sus credenciales públicas en `.env.local` y configurar Auth con correo verificado y registro público desactivado.
- [x] Autenticar GitHub CLI mediante OAuth y publicar `main` en el repositorio privado.
- [x] Conectar Netlify al repo privado, configurar variables públicas de Supabase y publicar con el runtime Next.js.
- [x] Definir Site URL y allowlist de redirect URLs en Supabase Auth para producción y desarrollo local.

> Validación: `npm run typecheck`, `npm run lint` y `npm run build` pasan localmente. Netlify completó el primer deploy de `main` (`b547d18`) y su runtime Next.js publicó una función sin errores. El repo privado `origin/main` está conectado con auto publishing activo. Supabase está saludable en `us-east-2` (Ohio), plan Nano/Free, con exposición automática de tablas desactivada y auto-RLS activado. Auth tiene Email habilitado, confirmación de correo activa, registro público desactivado, Site URL de producción y allowlist para producción/local. No hay tablas productivas, usuarios ni invitaciones. El sitio Netlify sigue privado porque el shell todavía no tiene autenticación ni rutas protegidas.

## Fases y aceptación

### Fase 0 — Infraestructura y shell (actual)
Tareas: bootstrap, navegación base responsive para socias/administración, dependencias esenciales, documentación, repo privado, Supabase, Netlify.
Aceptación: `npm run typecheck`, lint y build pasan; repo privado actualizado en GitHub; entorno Supabase enlazado; deploy Netlify automático desde `main` accesible sin errores.
Dependencias: resueltas para crear el primer deploy. Antes de abrirlo al público se requiere implementar autenticación y rutas protegidas en la Fase 1.

### Fase 1 — Acceso privado e invitaciones
Estado (2026-11-11): la primera administradora fue creada y verificada; migración y permisos de `service_role` aplicados; clave dedicada en `.env.local`; SMTP Resend usa `noreply@somoskuper.com`; Site URL de Auth `http://localhost:3000`. Siguen pendientes pruebas manuales de invitaciones y de roles/RLS con cuentas legítimas.
Tareas: perfiles, equipos y membresías; registro cerrado; invitación de uso único y vencimiento; recuperación; checks de rol server-side; RLS; pruebas con cuentas internas.
Aceptación: persona no invitada no accede; invitación validada crea membresía; RLS bloquea equipos ajenos; admin/editora/socia tienen permisos mínimos.
Dependencias: proyecto Supabase, migración aplicada y primera admin verificada.

### Fase 2 — Academia y CMS
Estado (2026-11-11): tres migraciones aplicadas en Supabase y diez módulos borrador verificados. Hay editor Tiptap con bloques y enlaces seguros, portadas, duplicación de módulos y lecciones, orden accesible, previsualización de borradores, biblioteca privada con búsqueda/filtros/paginación/eliminación segura, revisiones de publicación y portal de lectura. La sesión legítima de administración permitió verificar creación y edición de un módulo; el registro temporal se retiró. TypeScript, lint, build y pruebas de validación pasaron. Las llamadas anónimas a leer módulos y borrar recursos fueron rechazadas por RLS/permisos.
Pendiente: pruebas funcionales/RLS autenticadas de editora y socia, y contenido publicado de extremo a extremo. El editor ya guarda el borrador solo y conserva el texto si el guardado falla. La revisión automática bloqueó crear una lección de prueba en producción y una prueba mediante magic link de la admin. No se desplegó Netlify ni se hizo push por preferencia local-first.

### Fase 3 — Portal de socias y avance
Estado (2026-11-12): el portal de la socia está en `/app`, `/app/academy`, `/app/resources`, `/app/progress` y `/app/profile`. El avance y los checklists se guardan en Supabase con RLS. En el navegador se comprobó el estado vacío con los módulos en borrador, y después una lección publicada de prueba: abrirla la dejó en progreso, el checklist y «Marcar como completada» persistieron al recargar, y Mis avances mostró 1 de 1. Esa lección quedó archivada porque el trigger de revisiones publicadas impide borrarla. TypeScript y lint pasaron. Las pruebas de `tests/learning-progress.test.mjs` pasaron. No se ejecutó el build de producción porque el servidor de desarrollo usa `.next`. No hubo push ni deploy de Netlify.
Aceptación parcial: el acceso a archivos sigue condicionado por membresía y URLs firmadas; el avance es por usuaria y equipo. Faltan pruebas con una segunda socia, una cuenta suspendida y otro equipo.

### Fase 4 — Comunidad, comentarios y eventos
Tareas: preguntas, experiencias, comentarios por lección, retos, ejercicios, calendario y notificaciones; activar Realtime donde aporte valor.
Aceptación: RLS limita lectura/escritura al equipo y autoría/moderación definida; estados vacíos y notificaciones accesibles.

### Fase 5 — Mensajería directa y endurecimiento
Tareas: conversaciones/participantes, políticas exclusivas por participantes, auditoría, rendimiento, accesibilidad y operación.
Aceptación: solo participantes leen y escriben; controles de abuso/retención definidos; revisión de seguridad completada.

## Dependencias de trabajo
Fase 0 → Fase 1 → Fase 2 → Fase 3. Fase 4 depende de identidad, membresía y estructura de contenido. Mensajes privados dependen de membresías y reglas de seguridad maduras. La migración Fase 1 es aditiva; no se ejecutan cambios destructivos.

## Riesgos y decisiones pendientes
- El SMTP personalizado de Resend está guardado en Supabase; sigue pendiente prueba de entrega autorizada.
- Definir dominio y política de recuperación/expiración de invitaciones.
- Definir límites de archivo, derechos/licencias y retención de recursos.
- Definir quién puede publicar, moderar comentarios y reactivar membresías.
- El catálogo de componentes cambia: revisar compatibilidad/licencias al incorporar, no solo en esta fecha.
- Netlify tiene auto-publish desde `main`; mantener el trabajo local para evitar cargos hasta nueva instrucción.

## Próxima tarea recomendada
1. Crear/verificar la cuenta autorizada de la primera administradora y ejecutar el bootstrap documentado.
2. Probar rutas y RLS con cuentas internas de admin, editora y socia.
3. Autorizar una prueba de correo antes de validar entrega SMTP o enviar invitaciones reales.
