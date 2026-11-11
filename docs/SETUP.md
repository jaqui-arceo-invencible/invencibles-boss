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
Conecta el repo desde Netlify → Add new site → Import from Git. Selecciona `main`. Netlify detecta Next.js; no es necesario fijar un adaptador si la detección automática funciona. En Site configuration → Environment variables añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para los contextos necesarios y vuelve a desplegar.

## Acceso y correo
No habilites registro público definitivo. Antes de fase de invitaciones de producción configura SMTP confiable, redirect URLs exactas en Auth, URL de sitio y plantillas en Supabase. No envíes pruebas a socias sin consentimiento. Nunca compartas una contraseña de base de datos, token SMTP o clave service-role en chat, commits o cliente web.

## Estado de cuentas
Se creó la organización gratuita `Invencibles Boss` y el proyecto `invencibles-boss` en Supabase. Proyecto: [abrir dashboard](https://supabase.com/dashboard/project/qqhyqkklvlngcbyjdwfb). URL del proyecto: `https://qqhyqkklvlngcbyjdwfb.supabase.co`. La instancia está saludable en `us-east-2` (Ohio), plan Nano/Free. La exposición automática de tablas se dejó desactivada y el auto-RLS activado al crearla.

La clave publishable está configurada en `.env.local`, excluido de Git. No se guarda aquí; puede copiarse desde Project Settings → API Keys. No colocar en el cliente ni en Git claves `secret`/service-role ni la contraseña de Postgres.

Supabase Auth tiene habilitado el proveedor Email y la confirmación de correo. El registro de usuarios nuevos está desactivado, el proyecto no tiene usuarios y no se enviaron invitaciones. No se han creado tablas ni políticas productivas.

GitHub creó el repositorio privado [`jaqui-arceo-invencible/invencibles-boss`](https://github.com/jaqui-arceo-invencible/invencibles-boss). `main` ya está publicado y sigue el remoto `origin/main`. GitHub CLI se autenticó mediante OAuth para `jaqui-arceo-invencible`; Git usa HTTPS y la credencial está en el llavero del sistema (no en el repo ni en `.env.local`).

Netlify todavía no está vinculado y no se ha verificado un deploy. Después de publicar `main`, importar el repositorio en Netlify y añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en su gestor de variables.
