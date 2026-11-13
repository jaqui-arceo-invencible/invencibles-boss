# Arquitectura técnica

## Servicios y responsabilidades
- **Next.js App Router:** páginas, layouts, Server Components y Server Actions.
- **Supabase Auth:** identidad, verificación, invitación y recuperación.
- **PostgreSQL:** equipos, perfiles, membresías e invitaciones. RLS limita datos por usuaria, rol y equipo.
- **Storage / Realtime:** permanecen para fases posteriores; sus políticas se crearán junto con los recursos y tablas.
- **GitHub / Netlify:** código privado y hosting previo. Netlify sigue con autodeploy en `main`, pero por indicación de la usuaria no se publicará ni desplegará esta fase.

## Sesión y autenticación
El navegador usa `createBrowserClient`; código de servidor usa `createServerClient` con cookies. `proxy.ts` refresca tokens. Cada página protegida comprueba nuevamente al usuario con `getUser()` en el servidor y consulta la membresía activa. No hay registro público. La API Auth Admin se utiliza solo en servidor para enviar invitaciones. El nuevo alta usa `/invite/accept`: datos y contraseña, después OTP de tipo `invite`. Solo tras verificar el correo y una invitación pendiente vigente se guarda la cuenta y se llama al RPC `accept_invitation`. Nuevas invitaciones y reenvíos especifican 24 horas; la plantilla sin enlaces y la vigencia Auth deben activarse con `scripts/configure-invitation-codes.mjs`. El callback PKCE sigue disponible para recuperación y enlaces ya enviados. Recuperación usa un redirect propio y muestra la misma respuesta exista o no el correo.

## Roles
La autoridad sale de `memberships(user_id, team_id, role, status)`. Los roles son `admin`, `editor` y `member`. Las acciones del servidor vuelven a comprobar rol; RLS protege la base de datos. La editora no entra a administración de cuentas ni invitaciones. La socia solo ve el portal.

## Modelo relacional implementado
- `teams`: `id`, `name`, `slug`, `created_at`.
- `profiles`: `id` de Auth, `full_name`, `avatar_path` y timestamps.
- `memberships`: `team_id`, `user_id`, `role`, `status`, `joined_at` y timestamps; unique por equipo y usuario.
- `invitations`: equipo, correo, remitente, rol, estado, vencimiento, aceptación y timestamps. Un índice parcial impide duplicar invitaciones pendientes. No se almacena el token Auth.
- Enums `team_role`, `membership_status`, `invitation_status`.

Migración: `supabase/migrations/20261111170000_phase_1_auth_and_memberships.sql`. El equipo inicial se inserta idempotentemente. Un trigger crea perfiles. Funciones RLS fijan `search_path` vacío. Una usuaria modifica únicamente `full_name` y `avatar_path` propios. La membresía no puede editarse directamente: `admin_update_membership` exige admin e impide remover el último admin activo. `accept_invitation` verifica identidad y activa una única membresía. `bootstrap_first_admin` solo permite el rol PostgreSQL `service_role` y falla una vez que ya hay una admin.

## RLS
Denegar por defecto. La socia consulta su perfil, equipo y membresía; admin consulta integrantes e invitaciones de su equipo. El acceso a otros equipos queda bloqueado. Operaciones administrativas usan RPC segura o Auth Admin desde servidor. No existen todavía tablas de cursos, Storage ni comunidad, por lo que sus políticas se implementarán en fases futuras.

## Futuro CMS y recursos
Los módulos y lecciones serán registros ordenables, con borradores invisibles para socias. Recursos irán en bucket privado, ligados a equipo; se emitirán URLs firmadas cortas tras verificar membresía.

## Entornos y secretos
Desarrollo en `http://localhost:3000`; `.env.local` queda ignorado por Git. Solo URL y publishable key son públicas. `SUPABASE_SERVICE_ROLE_KEY` es server-only; Resend se configura en Auth SMTP de Supabase y no necesita incluirse en el frontend ni repositorio.

## Portal de aprendizaje
La socia entra por `/app`. El avance vive en `lesson_progress` y `checklist_item_progress`, siempre con el usuario de la sesión y RLS. El porcentaje no se guarda: se calcula con las lecciones publicadas. El manifiesto PWA no incluye service worker ni caché de contenido privado. El detalle está en `LEARNING_EXPERIENCE.md`, `PROGRESS_TRACKING.md` y `MOBILE_UX.md`.

## Comunidad
La base social vive en categorías, publicaciones, imágenes, un corazón por persona, comentarios de publicación o de lección, y reportes. Los comentarios de lección exigen lección y módulo publicados, y respetan `lessons.comments_enabled`. Las imágenes de la comunidad usan el bucket privado con el prefijo `{equipo}/community/{usuaria}/`; no entran en la biblioteca de recursos. Los mensajes directos, los avisos y la moderación viven en las mismas reglas: la base autoriza y la interfaz solo muestra lo que la sesión puede leer. El detalle está en `COMMUNITY_ARCHITECTURE.md`.

## CMS de Fase 2
La migración `20261111190000_phase_2_cms.sql` añadió módulos, lecciones, revisiones, bloques y recursos por equipo. El portal exige módulo y lección publicados; lee la revisión publicada, mientras el panel modifica una revisión de trabajo mediante funciones SQL transaccionales. El bucket `academy-private` guarda imágenes y PDF por equipo con URLs firmadas de 300 segundos. Ver `CMS_ARCHITECTURE.md`, `CONTENT_BLOCKS.md`, `STORAGE_AND_MEDIA.md` y `CONTENT_PUBLISHING.md`.
