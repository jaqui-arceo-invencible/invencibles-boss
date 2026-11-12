# Conexiones y puesta en marcha

## Trabajo local
1. Instala Node.js 20.9+ y pnpm.
2. Instala dependencias con `pnpm install`.
3. Copia `.env.example` a `.env.local`.
4. Define URL/clave publishable de Supabase y, solo en el servidor, `SUPABASE_SERVICE_ROLE_KEY`.
5. Inicia `pnpm dev` y abre `http://localhost:3000`.
6. Valida con `pnpm typecheck`, `pnpm lint` y `pnpm build`.

Variables de entorno:
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública.
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` durante desarrollo.
- `SUPABASE_SERVICE_ROLE_KEY`: clave secreta para invitaciones, administración y bootstrap; nunca poner prefijo `NEXT_PUBLIC_`.
- `BOOTSTRAP_ADMIN_EMAIL`: solo al ejecutar el script de bootstrap; no guardar ni subir a Git.

## Base de datos y primera administradora
La migración `supabase/migrations/20261111170000_phase_1_auth_and_memberships.sql` crea el equipo y el esquema protegido. Ya se aplicó desde el SQL Editor del proyecto Supabase. Como se ejecutó desde el panel, el historial local de Supabase CLI no se actualizó; si se configura CLI más adelante, registrar esta migración como aplicada antes de usar `db push` para evitar repetir DDL. No ejecutar pruebas que creen invitaciones a correos externos.

Para asignar la primera admin: crea su usuario y verifica el correo en Supabase Auth. Define `BOOTSTRAP_ADMIN_EMAIL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (ignorados por Git), luego ejecuta `node --env-file=.env.local scripts/bootstrap-first-admin.mjs`. El procedimiento exige cuenta verificada y falla si ya existe una admin activa.

## Correo y redirecciones
Auth SMTP está configurado con Resend, remitente `noreply@somoskuper.com`, nombre “Invencibles Boss”, host `smtp.resend.com` y puerto 465. La clave se guarda cifrada en Supabase Auth y no está en el repositorio. No se envió correo de prueba. Email está activo, confirmación habilitada y registro público desactivado.

El Site URL de Auth y `NEXT_PUBLIC_SITE_URL` están en `http://localhost:3000`. La allowlist conserva tanto `http://localhost:3000/**` como el redirect histórico de Netlify; el flujo local usa localhost explícitamente.

## GitHub y Netlify
El repositorio privado es [`jaqui-arceo-invencible/invencibles-boss`](https://github.com/jaqui-arceo-invencible/invencibles-boss). Netlify sigue conectado a `main` con autodeploy activo. Por indicación de la usuaria, este trabajo continúa localmente; no hacer push a `main` ni publicar despliegues hasta que lo pida, ya que puede generar costos.

Supabase: [abrir proyecto](https://supabase.com/dashboard/project/qqhyqkklvlngcbyjdwfb). Se mantiene exposición automática de tablas desactivada y auto-RLS activado.

## Portal de la socia
Con la migración de Fase 3 aplicada, una integrante entra en `http://localhost:3000/app`. Si no hay módulos publicados, el inicio muestra ceros y un estado vacío. Publicar una lección y su módulo la hace visible en `/app/academy`. El avance se guarda al abrir la lección y al pulsar «Marcar como completada».

## CMS de Fase 2
La migración `20261111190000_phase_2_cms.sql` se aplicó el 2026-11-11 desde SQL Editor. El historial de Supabase CLI no se actualizó: registrar la migración como aplicada antes de ejecutar `db push`. Los diez módulos iniciales están en borrador. En local, una administradora entra a `/admin/modules`, abre un módulo, crea una lección y guarda bloques; luego publica la lección y el módulo. La biblioteca está en `/admin/library`. Para comprobar URLs firmadas y RLS se requieren sesiones reales de cada rol.
