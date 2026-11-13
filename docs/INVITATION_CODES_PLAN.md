# Invitaciones por código y personalización

## Implementación

- Mantener el alta privada: solo administración puede invitar. Supabase crea la
  identidad pendiente y envía su OTP de invitación, nunca un enlace de acceso.
- Crear cuenta desde `/invite/accept`: datos y contraseña, después código del
  correo. Verificar OTP en servidor, validar invitación pendiente y correo,
  guardar contraseña/perfil y aceptar mediante el RPC con RLS existente.
- Un uso, 24 horas desde el envío; reenvío administrativo genera otro código y
  renueva la vigencia. Conservar límites de verificación de Supabase.
- Configurar solo la plantilla de invitación y la vigencia OTP requerida en
  Supabase Cloud. La vigencia OTP es global en Supabase (también afecta los
  correos de recuperación); no modificar SMTP, registro público ni permisos.
- Añadir Configuración en el portal con entrada a Administración solo para
  membresía activa `admin`; `/admin` conserva sus guardas de servidor.
- Reutilizar logotipo del login y colores vino/dorado/crema; conservar geometría,
  distribución y tipografía de la interfaz.

## Verificación

- Ocho pruebas locales correctas (cinco de invitaciones y tres de la regresión
  anterior del editor). Se cubren límite exacto de 24 horas, correo distinto,
  códigos y datos inválidos, estados aceptado/revocado/vencido y plantilla sin
  enlaces.
- `pnpm run typecheck`, `pnpm run lint`, `npm run build` y `git diff --check`:
  correctos.
- `GET http://localhost:3000/invite/accept`: HTTP 200.
- El HTML sirve la hoja de colores de marca y la regla de pasos ocultos.
  `/app/configuracion` y `/admin` redirigen a login sin sesión.
- No se enviaron correos reales ni se crearon cuentas de prueba. Sin inspección
  de navegador por preferencia del usuario.

## Activación cloud pendiente

La usuaria indicó «Dejar el correo pendiente por ahora». No continuar con la
configuración cloud hasta que solicite retomarla. El acceso a Configuración y
los colores/logotipo están activos en local.

La conexión OAuth actual responde HTTP 403 al leer Auth config porque falta el
permiso `auth_config_read` (`auth:read`). También se requiere `auth:write` para
aplicar la plantilla y `mailer_otp_exp: 86400`. No se modificó aún Auth Cloud;
los correos siguen usando su plantilla anterior hasta completar esa autorización.
El MCP también rechaza solicitar los scopes Auth adicionales (registro dinámico
HTTP 400: scopes no admitidos). Es necesario un PAT de Supabase con Auth Config
Read-write y Project Settings Read-write, accesible como `SUPABASE_ACCESS_TOKEN`
solo en servidor. No pegarlo en el chat.

El script preparado aplica solo esos dos cambios y el asunto del correo, respalda
los valores anteriores (sin SMTP ni secretos) y vuelve a leer para verificar.
Después establece `INVITATION_CODES_READY=true` en `.env.local`. Hasta entonces
crear/reenviar invitaciones informa de la configuración pendiente y no envía
correos con el enlace anterior. Para otro entorno, comprobar la configuración y
habilitar la variable también en el gestor de secretos de ese entorno.

Reversión: deshabilitar `INVITATION_CODES_READY`, restaurar únicamente los tres
campos del respaldo mediante Management API y revertir el código del flujo si se
quiere regresar al alta anterior. No hay cambios de tablas ni políticas RLS.

## Referencias

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/guides/auth/auth-email-passwordless

No se requiere migración: todas las inserciones/reenvíos especificarán
`expires_at`; no se alteran las invitaciones pendientes existentes.
