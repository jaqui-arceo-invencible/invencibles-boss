# Arquitectura técnica

## Servicios y responsabilidades
- **Next.js App Router:** páginas, layouts, Server Components, acciones y endpoints.
- **Supabase Auth:** identidad, verificación de correo, recuperación e invitaciones gestionadas por servidor.
- **PostgreSQL:** equipos, membresías, contenidos, progreso y conversación; RLS es el límite de autorización.
- **Storage:** bucket privado para materiales didácticos; objetos ligados a equipo/visibilidad.
- **Realtime:** habilitar solo para canales concretos de comentarios/comunidad cuando esas funciones se implementen.
- **GitHub / Netlify:** repositorio privado y builds/deploys automáticos desde `main`.

## Flujo de autenticación
El cliente de navegador usa `createBrowserClient`; código de servidor usa `createServerClient` con el almacén de cookies de Next.js. Un proxy/request boundary actualiza tokens expirados y propaga cookies. Para decisiones de autorización se verifica el token con métodos oficiales como `getClaims`, no se confía en datos no verificados ni en `getSession` por sí solo. La aplicación no ofrece registro público: el servidor verifica un token de invitación válido y de un solo uso antes de permitir activación/alta. Recuperación usa redirect allowlist a rutas propias.

## Autorización por roles
Roles iniciales: `admin`, `editor`, `member`. La autoridad se deriva de `team_memberships(user_id, team_id, role, status)` y del estado activo. Las operaciones de edición/administración se validan en Server Actions o Route Handlers y de nuevo con RLS. Nunca se acepta el rol desde el cuerpo del formulario como autoridad.

## Modelo relacional propuesto (aún no migrado)
- `teams`: id, name, slug, status, created_at.
- `profiles`: user_id (Auth), display_name, avatar_path, created_at.
- `team_memberships`: team_id, user_id, role, status, joined_at; unique(team_id,user_id).
- `invitations`: team_id, email_normalized, role, token_hash, expires_at, accepted_at, invited_by; token solo se presenta una vez y se guarda como hash.
- `learning_modules`: team_id, title, slug, summary, position, status, visibility, timestamps.
- `lessons`: module_id, title, position, status, content_schema_version; los bloques se guardan como JSON validado o tablas tipadas según capacidades editoriales.
- `resources`: team_id, storage_path, kind, title, visibility, metadata, created_by.
- `lesson_progress`: user_id, lesson_id, status, completed_at, updated_at; unique(user_id, lesson_id).
- `lesson_comments`: team_id, lesson_id, user_id, body, status, timestamps.
- `community_posts` y `community_replies`: team_id, author_id, body, moderation state.
- Posteriormente: `conversations`, `conversation_participants`, `messages`; membership y RLS deben verificar participante en cada lectura/escritura.

RLS: denegar por defecto. Lectura de contenido publicado solo a membresías activas del mismo equipo. Escritura según rol; usuarios ven/actualizan su perfil y su progreso; administración restringida por rol del mismo equipo. Comentarios y comunidad limitados al equipo activo. Policies de Storage replican la misma pertenencia. No aplicar hasta que consultas, roles, constraints y pruebas estén definidos.

## CMS
Los 10 módulos son datos administrables, no páginas fijas. CMS tendrá módulos ordenados, lecciones ordenables, bloques de texto/video/imagen/descarga/ejercicio y recursos vinculados. Guardar contenido en un formato estructurado/versionado, validar en servidor y publicar de forma transaccional. Mantener borradores invisibles a socias.

## Recursos privados
Bucket privado por defecto. Usar rutas como `team/{team_id}/resources/{resource_id}/{filename}`. No revelar rutas como autorización. Generar URLs firmadas cortas tras verificar membresía; límites/MIME/tamaño y protección de nombres en el servidor. Revisar derechos de uso y ciclo de vida antes de carga real.

## Comentarios y mensajería
Comentarios ligados a lección y membresía. Comunidad segmentada por `team_id`, con autoría, moderación y reportes definidos. Mensajes futuros solo accesibles si el usuario es participante activo; los mensajes públicos/realtime no son la fuente de autorización.

## Entornos, despliegue y seguridad
Desarrollo local (`.env.local`, ignorado); preview/producción con variables independientes en Netlify; Supabase staging recomendado antes de producción. Netlify usa su adaptador OpenNext para Next.js. Solo `NEXT_PUBLIC_SUPABASE_URL` y clave publishable/anónima se exponen; service role, DB password y SMTP quedan server-side. Revisar redirects Auth, HTTPS, dependencias, logs y headers. No activar registro abierto ni publicar claves privilegiadas.
