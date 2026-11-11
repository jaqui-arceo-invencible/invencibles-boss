# Arquitectura técnica

## Servicios y responsabilidades
- **Next.js App Router:** páginas, layouts, Server Components y Server Actions.
- **Supabase Auth:** identidad, verificación, invitación y recuperación.
- **PostgreSQL:** equipos, perfiles, membresías e invitaciones. RLS limita datos por usuaria, rol y equipo.
- **Storage / Realtime:** permanecen para fases posteriores; sus políticas se crearán junto con los recursos y tablas.
- **GitHub / Netlify:** código privado y hosting previo. Netlify sigue con autodeploy en `main`, pero por indicación de la usuaria no se publicará ni desplegará esta fase.

## Sesión y autenticación
El navegador usa `createBrowserClient`; código de servidor usa `createServerClient` con cookies. `proxy.ts` refresca tokens. Cada página protegida comprueba nuevamente al usuario con `getUser()` en el servidor y consulta la membresía activa. No hay registro público. La API Auth Admin se utiliza solo en servidor para enviar invitaciones. El callback intercambia el código PKCE; después, la invitada define contraseña, completa su nombre y acepta la invitación desde una función SQL que verifica identidad, correo verificado, metadata, vigencia y estado. Recuperación usa un redirect propio y muestra la misma respuesta exista o no el correo.

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
