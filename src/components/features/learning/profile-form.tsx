"use client";
/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */

import { useActionState, useRef } from "react";
import { changePassword, updateAvatar, updateDirectoryVisibility, updateDisplayName } from "@/app/app/profile/actions";
import { PrimaryButton } from "@/components/design/buttons";
import { SettingsSection } from "@/components/design/settings-section";
import { SignOutButton } from "@/components/features/sign-out-button";
import { FilePicker } from "@/components/ui/file-picker";

const idle = { ok: true, message: "" };

export function ProfileForm({ name, avatarUrl, directoryVisible }: { name: string; avatarUrl: string; directoryVisible: boolean }) {
  const avatarForm = useRef<HTMLFormElement>(null);
  const [nameState, nameAction, namePending] = useActionState(updateDisplayName, idle);
  const [avatarState, avatarAction, avatarPending] = useActionState(updateAvatar, idle);
  const [directoryState, directoryAction, directoryPending] = useActionState(updateDirectoryVisibility, idle);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, idle);

  return <>
    <SettingsSection title="Tu nombre">
      <form className="ds-form" action={nameAction}>
        <label>Nombre completo<input name="full_name" defaultValue={name} autoComplete="name" required minLength={2} maxLength={80} /></label>
        <PrimaryButton type="submit" disabled={namePending}>{namePending ? "Guardando…" : "Guardar nombre"}</PrimaryButton>
        {nameState.message ? <p className="form-note" role="status">{nameState.message}</p> : null}
      </form>
    </SettingsSection>
    <SettingsSection title="Tu imagen">
      <form ref={avatarForm} className="ds-form" action={avatarAction}>
        {avatarUrl ? <img className="profile-photo" src={avatarUrl} alt="" /> : null}
        <FilePicker label={avatarPending ? "Subiendo…" : "Subir imagen"} disabled={avatarPending} name="avatar" accept="image/jpeg,image/png,image/webp" onChange={(event) => { if (event.currentTarget.files?.length) avatarForm.current?.requestSubmit(); }} />
        <p className="form-hint">JPG, PNG o WebP. Menos de 5 MB.</p>
        {avatarState.message ? <p className="form-note" role="status">{avatarState.message}</p> : null}
      </form>
    </SettingsSection>
    <SettingsSection title="Directorio">
      <form className="ds-form" action={directoryAction}>
        <label className="community-check"><input name="directory_visible" type="checkbox" defaultChecked={directoryVisible} /> Aparecer en el directorio del equipo</label>
        <p className="form-hint">Si lo desactivas, no aparecerás en el directorio. Tus publicaciones siguen mostrando tu nombre.</p>
        <PrimaryButton type="submit" disabled={directoryPending}>{directoryPending ? "Guardando…" : "Guardar visibilidad"}</PrimaryButton>
        {directoryState.message ? <p className="form-note" role="status">{directoryState.message}</p> : null}
      </form>
    </SettingsSection>
    <SettingsSection title="Contraseña">
      <form className="ds-form" action={passwordAction}>
        <label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
        <label>Confirmar contraseña<input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label>
        <PrimaryButton type="submit" disabled={passwordPending}>{passwordPending ? "Guardando…" : "Cambiar contraseña"}</PrimaryButton>
        {passwordState.message ? <p className="form-note" role="status">{passwordState.message}</p> : null}
      </form>
    </SettingsSection>
    <SignOutButton label="Cerrar sesión" />
  </>;
}
