"use client";

import { resendInvitation } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ResendInvitationButton({ id }: { id: string }) {
  return <form action={resendInvitation}><input type="hidden" name="invitation_id" value={id} /><Button size="sm" variant="outline" type="submit">Reenviar</Button></form>;
}
