create extension if not exists pgcrypto with schema extensions;

create type public.team_role as enum ('admin', 'editor', 'member');
create type public.membership_status as enum ('active', 'suspended', 'revoked');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.teams (name, slug)
values ('Invencibles Boss', 'invencibles-boss')
on conflict (slug) do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role public.team_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, team_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  role public.team_role not null default 'member' check (role in ('editor', 'member')),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '1 hour'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index invitations_one_pending_per_team_email
  on public.invitations (team_id, lower(email)) where status = 'pending';
create index memberships_user_team_status_idx on public.memberships(user_id, team_id, status);
create index invitations_team_status_created_idx on public.invitations(team_id, status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger memberships_touch_updated_at before update on public.memberships
for each row execute function public.touch_updated_at();
create trigger invitations_touch_updated_at before update on public.invitations
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

create or replace function public.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = target_team and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

create or replace function public.has_team_role(target_team uuid, allowed_roles public.team_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = target_team and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.has_team_role(uuid, public.team_role[]) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.has_team_role(uuid, public.team_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

create policy profiles_read_self_or_team_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or exists (
  select 1 from public.memberships mine
  join public.memberships target on target.team_id = mine.team_id
  where mine.user_id = (select auth.uid()) and mine.status = 'active' and mine.role = 'admin'
    and target.user_id = profiles.id
));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy teams_read_active_member on public.teams for select to authenticated
using (public.is_team_member(id));

create policy memberships_read_self_or_admin on public.memberships for select to authenticated
using (user_id = (select auth.uid()) or public.has_team_role(team_id, array['admin']::public.team_role[]));
create policy memberships_admin_update on public.memberships for update to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]))
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

create policy invitations_admin_read on public.invitations for select to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]));

revoke all on public.profiles, public.teams, public.memberships, public.invitations from anon, authenticated;
grant select on public.profiles, public.teams, public.memberships, public.invitations to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;
grant all on public.profiles, public.teams, public.memberships, public.invitations to service_role;

create or replace function public.accept_invitation(invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation public.invitations%rowtype;
  is_verified boolean;
begin
  if current_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select (u.email_confirmed_at is not null) into is_verified from auth.users u where u.id = current_user_id;
  if not coalesce(is_verified, false) then raise exception 'email_not_verified' using errcode = '42501'; end if;

  select * into invitation from public.invitations i where i.id = invitation_id for update;
  if not found or lower(invitation.email) <> current_email then
    raise exception 'invitation_invalid' using errcode = '22023';
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    if invitation.status = 'pending' and invitation.expires_at <= now() then
      update public.invitations set status = 'expired' where id = invitation.id;
    end if;
    raise exception 'invitation_expired_or_used' using errcode = '22023';
  end if;
  if coalesce(auth.jwt() -> 'user_metadata' ->> 'invitation_id', '') <> invitation.id::text then
    raise exception 'invitation_identity_mismatch' using errcode = '42501';
  end if;

  insert into public.memberships(user_id, team_id, role, status)
  values (current_user_id, invitation.team_id, invitation.role, 'active')
  on conflict (user_id, team_id) do update set role = excluded.role, status = 'active', joined_at = now();
  update public.invitations set status = 'accepted', accepted_at = now() where id = invitation.id;
end;
$$;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

create or replace function public.admin_update_membership(
  target_membership uuid,
  new_role public.team_role,
  new_status public.membership_status
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.memberships%rowtype;
  active_admins bigint;
begin
  if not public.has_team_role((select m.team_id from public.memberships m where m.id = target_membership), array['admin']::public.team_role[]) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select * into target from public.memberships where id = target_membership for update;
  if target.user_id = auth.uid() and (new_role <> 'admin' or new_status <> 'active') then
    raise exception 'cannot_remove_own_admin_access' using errcode = '22023';
  end if;
  if target.role = 'admin' and target.status = 'active' and (new_role <> 'admin' or new_status <> 'active') then
    select count(*) into active_admins from public.memberships
    where team_id = target.team_id and role = 'admin' and status = 'active';
    if active_admins <= 1 then raise exception 'last_active_admin' using errcode = '22023'; end if;
  end if;
  update public.memberships set role = new_role, status = new_status where id = target_membership;
end;
$$;
revoke all on function public.admin_update_membership(uuid, public.team_role, public.membership_status) from public, anon;
grant execute on function public.admin_update_membership(uuid, public.team_role, public.membership_status) to authenticated;

create or replace function public.bootstrap_first_admin(admin_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  admin_user_id uuid;
  default_team uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  if exists (select 1 from public.memberships where role = 'admin' and status = 'active') then
    raise exception 'admin_already_bootstrapped' using errcode = '22023';
  end if;
  select id into admin_user_id from auth.users
  where lower(email) = lower(admin_email) and email_confirmed_at is not null;
  if admin_user_id is null then raise exception 'verified_user_not_found' using errcode = '22023'; end if;
  select id into default_team from public.teams where slug = 'invencibles-boss';
  insert into public.profiles(id) values (admin_user_id) on conflict (id) do nothing;
  insert into public.memberships(user_id, team_id, role, status)
  values (admin_user_id, default_team, 'admin', 'active')
  on conflict (user_id, team_id) do update set role = 'admin', status = 'active';
end;
$$;
revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
