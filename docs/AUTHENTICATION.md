# Autenticación y sesiones

## Inicio de sesión
`/login` acepta correo y contraseña. No hay enlace de registro. Supabase SSR guarda la sesión en cookies httpOnly/secure según entorno; `proxy.ts` refresca claims y las páginas vuelven a verificar identidad en servidor.

## Invitación y activación
La acción administrativa valida rol, correo, equipo y duplicados; crea el registro pendiente y llama `auth.admin.inviteUserByEmail` desde un módulo de servidor. El token del enlace es gestionado por Supabase Auth. `/auth/callback` intercambia el código PKCE y solo permite redirección local. La invitada establece contraseña y nombre; `accept_invitation` valida que corresponda al correo verificado y a la invitación pendiente/no vencida, y crea la membresía activa. El flujo es idempotente ante reintentos.

## Recuperación
`/forgot-password` llama `resetPasswordForEmail` y siempre muestra una respuesta neutral. El enlace regresa por callback a `/reset-password`, donde la sesión válida permite establecer una contraseña de al menos 12 caracteres.

## Operaciones administrativas
`SUPABASE_SERVICE_ROLE_KEY` solo se usa en `src/lib/supabase/admin.ts` (marcado `server-only`). No importarlo en componentes cliente. Las acciones verifican admin antes de crear/revocar invitaciones o leer el directorio. Supabase Auth SMTP usa Resend; no se envió correo de prueba.

## Requisitos de entorno
El registro público en Supabase permanece desactivado y Email/confirmación de email activos. El Site URL usa `http://localhost:3000`; los redirects locales y el redirect histórico de Netlify continúan permitidos.
