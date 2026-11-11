# Flujo de invitación

```mermaid
sequenceDiagram
  actor Admin as Administradora
  participant Web as App Next.js
  participant Auth as Supabase Auth
  participant DB as PostgreSQL/RLS
  participant Mail as SMTP Resend
  actor Invitee as Invitada

  Admin->>Web: Captura correo, nombre opcional y rol
  Web->>DB: Valida admin, duplicados y crea pending (7 días)
  Web->>Auth: inviteUserByEmail con invitation_id
  Auth->>Mail: Envía enlace de un solo uso
  Mail-->>Invitee: Enlace a callback de la app
  Invitee->>Web: Abre y define contraseña/nombre
  Web->>Auth: Intercambia código PKCE y confirma email
  Web->>DB: accept_invitation(id)
  DB->>DB: Valida email, metadata, pending y expiración
  DB->>DB: Crea/reactiva membership y marca accepted
  Web-->>Invitee: Portal privado
```

## Estados y errores
- `pending`: esperando aceptación; expira en una hora, alineado al plazo predeterminado del enlace Auth.
- `accepted`: usuario validado y membresía activada.
- `expired`: vencida; se debe crear una nueva invitación.
- `revoked`: cancelada por admin; no puede aceptarse.
- Correo registrado con membresía en el equipo: no se invita de nuevo.
- Cuenta Auth ya existente: Supabase puede rechazar la invitación; se informa sin revelar datos sensibles.
- Enlace usado, email distinto, inválido o expirado: no activa membresía; muestra estado seguro.
- Reenvío: reenvía invitación pendiente por la API Auth Admin; errores se presentan de forma comprensible.
- Error SMTP: se marca la invitación como revocada al fallar el envío inicial, evitando dejar un pendiente que no recibió correo.

No se guardan tokens en la tabla ni se envían invitaciones de prueba a terceros.
