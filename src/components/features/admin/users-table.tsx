"use client";

import { useMemo, useState } from "react";
import { updateMembership } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminUserRow = {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "member";
  status: "active" | "suspended" | "revoked";
  joinedAt: string;
};

const roleLabel = { admin: "Administradora", editor: "Editora", member: "Socia" };
const statusLabel = { active: "Activa", suspended: "Suspendida", revoked: "Revocada" };

export function UsersTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = useMemo(() => users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()) &&
    (roleFilter === "all" || user.role === roleFilter) && (statusFilter === "all" || user.status === statusFilter)), [users, query, roleFilter, statusFilter]);

  return <>
    <div className="table-controls"><Input aria-label="Buscar integrantes" placeholder="Buscar por nombre o correo" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Todos los roles</option><option value="admin">Administradora</option><option value="editor">Editora</option><option value="member">Socia</option></select>
      <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activa</option><option value="suspended">Suspendida</option><option value="revoked">Revocada</option></select>
    </div>
    <p className="admin-results-count" role="status">{filtered.length} de {users.length} integrantes</p>
    <div className="responsive-table"><table><thead><tr><th>Integrante</th><th>Rol</th><th>Estado</th><th>Se unió</th><th>Acciones</th></tr></thead><tbody>
      {filtered.map((user) => <tr key={user.membershipId}><td><strong>{user.name || "Perfil pendiente"}</strong><small>{user.email}</small></td><td>{roleLabel[user.role]}</td><td><span className={`status-badge status-${user.status}`}>{statusLabel[user.status]}</span></td><td>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("es-MX") : "—"}</td><td>{user.id === currentUserId ? <span className="admin-results-count">Tu cuenta</span> : <details className="admin-access-editor"><summary>Editar acceso</summary><form action={updateMembership} className="user-action-form" onSubmit={(event) => { if (!window.confirm("¿Confirmas este cambio de acceso?")) event.preventDefault(); }}>
        <input type="hidden" name="membership_id" value={user.membershipId} />
        <select name="role" aria-label={`Rol de ${user.name || user.email}`} defaultValue={user.role} disabled={user.id === currentUserId}><option value="admin">Administradora</option><option value="editor">Editora</option><option value="member">Socia</option></select>
        <select name="status" aria-label={`Estado de ${user.name || user.email}`} defaultValue={user.status} disabled={user.id === currentUserId}><option value="active">Activa</option><option value="suspended">Suspendida</option><option value="revoked">Revocada</option></select>
        <Button size="sm" type="submit" variant="outline" disabled={user.id === currentUserId}>Guardar</Button>
      </form></details>}</td></tr>)}
      {!filtered.length && <tr><td colSpan={5} className="table-empty">{users.length ? "No encontramos resultados con esos filtros." : "Todavía no hay integrantes. Envía una invitación para comenzar."}</td></tr>}
    </tbody></table></div>
  </>;
}
