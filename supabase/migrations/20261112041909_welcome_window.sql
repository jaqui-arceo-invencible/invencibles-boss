create or replace function public.membership_is_in_welcome_window(target_team uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.team_id = target_team
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.joined_at <= now()
      and m.joined_at > now() - interval '72 hours'
  );
$$;

revoke all on function public.membership_is_in_welcome_window(uuid) from public, anon;
grant execute on function public.membership_is_in_welcome_window(uuid) to authenticated;
