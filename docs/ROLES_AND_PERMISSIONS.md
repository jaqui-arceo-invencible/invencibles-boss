# Roles y permisos

Los roles son por equipo y solo cuentan cuando `memberships.status = active`.

| Recurso/acción | Admin | Editora | Socia |
|---|---:|---:|---:|
| Portal y perfil propio | Sí | Sí | Sí |
| Dashboard administrativo | Sí | Sí | No |
| Futuro CMS de contenido | Sí | Sí | No |
| Consultar usuarias e invitaciones | Sí | No | No |
| Crear/revocar invitaciones | Sí | No | No |
| Cambiar roles/estado | Sí | No | No |
| Cambiar su propio rol | No | No | No |

## RLS
- `profiles`: lectura propia; admins consultan perfiles de integrantes de su equipo; cada usuario solo actualiza `full_name` y `avatar_path` propios.
- `teams`: integrantes activos del equipo.
- `memberships`: la usuaria lee su propia membresía; admins leen integrantes de su equipo. Sin update SQL directo.
- `invitations`: admin lee solo invitaciones del equipo. Escritura se hace desde Auth/Admin API y funciones del servidor.
- `accept_invitation`: solo Auth autenticado; valida email confirmado, email de invitación, metadata, estado y vencimiento.
- `admin_update_membership`: función restringida que valida admin y conserva al menos una admin activa.
- `bootstrap_first_admin`: solo `service_role`, solo con una cuenta Auth verificada y solo si aún no hay admin.

Las funciones usan `search_path` vacío. No existen todavía policies de cursos, comentarios o Storage; se crearán al añadir esas tablas.
