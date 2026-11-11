# Conexiones y puesta en marcha

## Qué hace cada servicio
- **GitHub privado:** guarda el código y su historial. Cada commit en `main` puede activar build/deploy en Netlify.
- **Supabase:** autenticación y base de datos; más adelante Storage privado y Realtime. El acceso se protege con RLS.
- **Netlify:** construye y publica Next.js desde GitHub usando el adaptador oficial mantenido por Netlify. Variables de entorno se guardan en su UI.

## Trabajo local
1. Instala Node.js 20.9+ y npm.
2. Clona el repositorio y ejecuta `npm install`.
3. Copia `.env.example` a `.env.local`.
4. Una persona administradora obtiene la URL y clave publishable desde Supabase Project Settings → API Keys y las coloca en `.env.local`.
5. Ejecuta `npm run dev`; abre `http://localhost:3000`.
6. `npm run lint`, `npm run typecheck` y `npm run build` verifican calidad/build.

## Publicación
El sitio Netlify importa el repositorio privado desde GitHub y publica `main`. Netlify detectó Next.js y usó su runtime oficial; el build command es `npm run build` y el script invoca `next build --webpack`. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` se guardan en el gestor de variables de Netlify. Son la URL y la clave publishable; nunca guardar claves `secret`/service-role ahí como variables `NEXT_PUBLIC_`.

## Acceso y correo
El Site URL de Supabase Auth está configurado como `https://invencibles-boss.netlify.app`. La allowlist incluye `http://localhost:3000/**` y `https://invencibles-boss.netlify.app/**`. El registro público está desactivado. Antes de la fase de invitaciones configura SMTP confiable y plantillas en Supabase. No envíes pruebas a socias sin consentimiento. Nunca compartas una contraseña de base de datos, token SMTP o clave service-role en chat, commits o cliente web.

## Estado de cuentas
Se creó la organización gratuita `Invencibles Boss` y el proyecto `invencibles-boss` en Supabase. Proyecto: [abrir dashboard](https://supabase.com/dashboard/project/qqhyqkklvlngcbyjdwfb). URL del proyecto: `https://qqhyqkklvlngcbyjdwfb.supabase.co`. La instancia está saludable en `us-east-2` (Ohio), plan Nano/Free. La exposición automática de tablas se dejó desactivada y el auto-RLS activado al crearla.

La clave publishable está configurada en `.env.local`, excluido de Git. No se guarda aquí; puede copiarse desde Project Settings → API Keys. No colocar en el cliente ni en Git claves `secret`/service-role ni la contraseña de Postgres.

Supabase Auth tiene habilitado el proveedor Email y la confirmación de correo. El registro de usuarios nuevos está desactivado, el proyecto no tiene usuarios y no se enviaron invitaciones. No se han creado tablas ni políticas productivas.

GitHub creó el repositorio privado [`jaqui-arceo-invencible/invencibles-boss`](https://github.com/jaqui-arceo-invencible/invencibles-boss). `main` ya está publicado y sigue el remoto `origin/main`. GitHub CLI se autenticó mediante OAuth para `jaqui-arceo-invencible`; Git usa HTTPS y la credencial está en el llavero del sistema (no en el repo ni en `.env.local`).

Netlify está vinculado al repo privado en el equipo `Invencibles Boss`: [abrir proyecto](https://app.netlify.com/projects/invencibles-boss). Primer deploy exitoso desde `main` en `b547d18`; [sitio](https://invencibles-boss.netlify.app). El deploy se construyó con el runtime Next.js de Netlify y publicó una función. Los dos valores públicos de Supabase están configurados en las variables del sitio.

Netlify mantiene el sitio como **Private**. Conviene dejarlo así mientras el portal sigue siendo un shell demostrativo: la autenticación, las rutas protegidas y RLS todavía no están implementadas. No compartir datos reales ni abrir el sitio al público hasta completar la Fase 1.
