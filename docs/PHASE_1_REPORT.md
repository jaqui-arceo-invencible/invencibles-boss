# Informe de Fase 1

## Funcionalidades implementadas en código
- Login sin registro público, recuperación y actualización de contraseña.
- Callback PKCE, aceptación de invitación y onboarding.
- Guards server-side para portal y administración; rol admin/editor/socia.
- Administración de integrantes con búsqueda/filtros y protección del último admin.
- Creación, historial, reenvío y revocación de invitaciones.
- Bootstrap único de primera admin y migración versionada con RLS.
- SMTP Resend guardado en Auth/Supabase con remitente `noreply@somoskuper.com`; no se envió correo de prueba.

## Archivos clave
`src/lib/auth/guards.ts`, `src/lib/supabase/admin.ts`, `src/app/auth`, `src/app/admin`, `src/app/login`, `src/app/forgot-password`, `src/app/reset-password`, `src/app/invite`, `src/app/onboarding`, `supabase/migrations/20261111170000_phase_1_auth_and_memberships.sql`, `scripts/bootstrap-first-admin.mjs`.

## Migraciones
- `20261111170000_phase_1_auth_and_memberships.sql`: equipos, perfiles, membresías, invitaciones, enums, triggers, funciones protegidas y RLS.

## Verificaciones
- `npm run typecheck`: pasó.
- `npm run lint`: pasó.
- Build de producción: pasó con `pnpm build`. pnpm intentó sincronizar dependencias y no pudo consultar npm por DNS; continuó con los paquetes instalados y completó la compilación.
- La migración se ejecutó en el SQL Editor de Supabase y respondió `Success. No rows returned`.
- La clave secreta local validó acceso a `teams`, `memberships`, `invitations` y Auth; hay un equipo y cero usuarias, membresías o invitaciones.
- No se han creado usuarios ni enviado invitaciones o correos de prueba. Auth muestra cero usuarios; el bootstrap de la primera admin y pruebas de autorización quedan pendientes de una cuenta verificada.

## Configuración externa
- Supabase SMTP personalizado está guardado y se verificó tras recargar el panel: Resend, `noreply@somoskuper.com`, remitente “Invencibles Boss”, puerto 465. No se envió correo de prueba.
- `.env.local` contiene URL y publishable key, la clave secreta dedicada `invencibles_boss_local` y callback `http://localhost:3000`; el archivo está ignorado por Git. La clave `default` que quedó visible en un borrador descartado fue revocada y la clave local nueva funciona.
- Supabase Auth usa `http://localhost:3000` como Site URL. Se conserva el redirect histórico de Netlify en la allowlist. No desplegar a Netlify ni hacer push a `main` por instrucción de la usuaria.
- La migración se aplicó desde el SQL Editor y está versionada en `supabase/migrations`; no se escribió el registro de la Supabase CLI. La validación inicial reveló que faltaba conceder acceso de tabla a `service_role`; se corrigió y se aplicó ese GRANT adicional.

## Decisiones y pendientes
- Tabla nombrada `memberships` según el prompt actual (la arquitectura previa mencionaba `team_memberships`).
- Los tokens permanecen en Auth, no en `invitations`.
- No existe carga de avatar todavía; el campo está listo, sin bucket habilitado.
- Revisar los errores de resend de cuentas ya confirmadas; la API Auth puede requerir una nueva invitación o recuperar acceso según el estado de la cuenta.
- El dashboard principal conserva contenido demostrativo de la Fase 0.
