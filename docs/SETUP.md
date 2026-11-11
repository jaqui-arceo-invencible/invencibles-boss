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
Se creó la organización gratuita `Invencibles Boss` en Supabase. El formulario del proyecto `invencibles-boss` está preparado en Americas (la recomendación general se resuelve cerca de México) con la exposición automática de tablas desactivada y auto-RLS activado. Supabase requiere que la persona propietaria escriba una contraseña nueva de base de datos directamente en su formulario y pulse crear; no compartirla ni guardarla en el repo.

GitHub creó el repositorio privado `jaqui-arceo-invencible/invencibles-boss`. El commit inicial `577533c` existe localmente; el push desde esta terminal falla porque no hay credencial Git disponible, aunque el navegador esté autenticado. Conectar GitHub Desktop o configurar autenticación Git y publicar `main`.

Netlify todavía no está vinculado y no se ha verificado un deploy. Completar el push primero, luego importar el repo y guardar las variables desde su gestor seguro. No se han creado tablas de producción ni enviado invitaciones.
