"use client";

import { revokeInvitation } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function RevokeInvitationButton({ id }: { id: string }) {
  return <form action={revokeInvitation} onSubmit={(event) => {
    if (!window.confirm("¿Revocar esta invitación? La persona ya no podrá usar su enlace.")) event.preventDefault();
  }}><input type="hidden" name="invitation_id" value={id} /><Button size="sm" variant="outline" type="submit">Revocar</Button></form>;
}
